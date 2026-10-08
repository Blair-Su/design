import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { MODEL, cloudflareMessages } from '../cloudflare/worker.js';
import { validatePayload } from '../server/chat-shared.js';
import { fallbackAnswer } from '../assets/chat/faq.js';
import { readSSE } from '../assets/chat/core.js';

const origin = 'https://www.blairsu.design';
const request = (body = { message: 'What is Lighthouse?' }, options = {}) => new Request('https://blair-portfolio-chat.test/api/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...options.headers },
  body: typeof body === 'string' ? body : JSON.stringify(body), signal: options.signal,
});
const sse = values => {
  const data = values.map(value => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`).join('');
  const bytes = new TextEncoder().encode(data);
  return new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 3) c.enqueue(bytes.slice(i, i + 3)); c.close(); } });
};
const environment = run => ({ AI_ENABLED: 'true', AI: { run }, CHAT_RATE_LIMITER: { limit: async () => ({ success: true }) } });
const events = async response => { const values = []; for await (const value of readSSE(response.body)) values.push(value === '[DONE]' ? value : JSON.parse(value)); return values; };

test('Cloudflare streams fragmented multilingual content and omits reasoning', async () => {
  const env = environment(async (model, input) => {
    assert.equal(model, MODEL); assert.equal(input.max_tokens, 600); assert.equal(input.stream, true);
    assert.match(input.messages[0].content, /Portfolio references/);
    assert.match(input.messages.at(-1).content, /no_think/);
    return sse([
      { choices: [{ delta: { reasoning_content: 'Never shown' } }] },
      { choices: [{ delta: { content: '<thi' } }] },
      { choices: [{ delta: { content: 'nk>Hidden thought</thi' } }] },
      { choices: [{ delta: { content: 'nk>你好🦊' } }] },
      { choices: [{ delta: { content: '，看看作品集。' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] }, '[DONE]',
    ]);
  });
  const response = await worker.fetch(request(), env);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const result = await events(response);
  assert.equal(result.filter(e => e.delta).map(e => e.delta).join(''), '你好🦊，看看作品集。');
  assert.equal(result.at(-1), '[DONE]');
  assert.doesNotMatch(JSON.stringify(result), /Hidden|Never|think/);
});

test('Cloudflare setup/quota/provider failures use labelled FAQ without a paid fallback', async () => {
  let calls = 0;
  const run = async () => { calls++; throw new Error('provider-secret'); };
  for (const env of [
    {}, { AI_ENABLED: 'false' }, { AI_ENABLED: 'true', AI: { run } },
    { ...environment(run), CHAT_RATE_LIMITER: { limit: async () => ({ success: false }) } },
    { ...environment(run), CHAT_RATE_LIMITER: { limit: async () => { throw new Error('quota unavailable'); } } },
  ]) {
    const result = await events(await worker.fetch(request(), env));
    assert.equal(result[0].mode, 'faq'); assert.match(result[1].delta, /Lighthouse/); assert.equal(result.at(-1), '[DONE]');
  }
  assert.equal(calls, 0);
  const result = await events(await worker.fetch(request(), environment(run)));
  assert.equal(calls, 1); assert.equal(result[0].mode, 'faq'); assert.doesNotMatch(JSON.stringify(result), /provider-secret/);
});

test('Cloudflare validates origin, method, byte limit and payload before calling AI', async () => {
  let called = false;
  const env = environment(async () => { called = true; });
  assert.equal((await worker.fetch(request(undefined, { headers: { Origin: 'https://evil.test' } }), env)).status, 403);
  assert.equal((await worker.fetch(request('not json'), env)).status, 400);
  assert.equal((await worker.fetch(request({ message: 'hi', conversationHistory: [{ role: 'system', content: 'spoof' }] }), env)).status, 400);
  assert.equal((await worker.fetch(request({ message: 'hi', padding: '你'.repeat(12000) }), env)).status, 413);
  assert.equal((await worker.fetch(request(undefined, { headers: { 'Content-Type': 'text/plain' } }), env)).status, 415);
  assert.equal((await worker.fetch(new Request('https://worker.test/api/chat'), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://worker.test/other'), env)).status, 404);
  const preflight = await worker.fetch(new Request('https://worker.test/api/chat', { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(called, false);
});

test('interrupted or length-limited AI replies are never marked complete or replaced with FAQ', async () => {
  for (const last of [[], [{ choices: [{ delta: {}, finish_reason: 'length' }] }, '[DONE]']]) {
    const result = await events(await worker.fetch(request(), environment(async () => sse([{ choices: [{ delta: { content: 'Partial answer' } }] }, ...last]))));
    assert.ok(result.some(e => e.error)); assert.ok(!result.includes('[DONE]')); assert.ok(!result.some(e => e.mode === 'faq'));
  }
  const empty = await events(await worker.fetch(request(), environment(async () => sse(['[DONE]']))));
  assert.equal(empty[0].mode, 'faq');
});

test('native Workers AI delta format is translated to the frontend stream', async () => {
  const result = await events(await worker.fetch(request(), environment(async () => sse([{ response: 'Hello' }, '[DONE]']))));
  assert.deepEqual(result, [{ delta: 'Hello' }, '[DONE]']);
});

test('cancelling the frontend stream cancels the upstream stream', async () => {
  let cancelled = false;
  const env = environment(async () => new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('data: {"response":"Hello"}\n\n')); },
    cancel() { cancelled = true; },
  }));
  const response = await worker.fetch(request(), env);
  const reader = response.body.getReader(); await reader.read(); await reader.cancel();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(cancelled, true);
});

test('free model context stays bounded and saved answers stay source-linked', () => {
  const payload = validatePayload({ message: 'Tell me about HHI', conversationHistory: Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(1500) })), pageContext: { projectSlug: 'project-3-hhi', version: 'preview' } });
  const messages = cloudflareMessages(payload);
  assert.ok(messages.slice(1, -1).reduce((n, m) => n + m.content.length, 0) <= 6000);
  assert.match(messages[0].content, /26 of 30/);
  assert.ok(messages[0].content.length < 15000);
  assert.match(fallbackAnswer({ message: '怎么联系 Blair？' }).content, /mailto:suxun70@gmail.com/);
  assert.match(fallbackAnswer({ message: 'What is Lighthouse?' }).content, /\/project-1-lighthouse\//);
  assert.match(fallbackAnswer({ message: 'Tell me about this project', pageContext: { projectSlug: 'project-4-nalu' } }).content, /Nalu/);
  assert.match(fallbackAnswer({ message: 'What is my bank balance?' }).content, /do not cover/);
});
