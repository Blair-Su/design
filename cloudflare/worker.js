import { BODY_LIMIT, validatePayload, buildInstructions } from '../server/chat-shared.js';
import { readSSE } from '../assets/chat/core.js';
import { fallbackAnswer } from '../assets/chat/faq.js';

// A single model available on Workers Free. No paid-provider fallback,
// AI Gateway credits, database, or external API key is used by this Worker.
export const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const encoder = new TextEncoder();
const event = value => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`;
const streamHeaders = { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform' };

function faqResponse(payload, headers) {
  const answer = fallbackAnswer(payload);
  return new Response(event({ mode: 'faq' }) + event({ delta: answer.content }) + event('[DONE]'), { headers: { ...headers, ...streamHeaders } });
}

export function cloudflareMessages(payload) {
  let remaining = 6000;
  const history = [];
  for (const message of payload.conversationHistory.slice(-6).reverse()) {
    if (message.content.length > remaining) break;
    remaining -= message.content.length;
    history.unshift(message);
  }
  if (history[0]?.role === 'assistant') history.shift();
  return [
    { role: 'system', content: buildInstructions(payload.pageContext, { compact: true, question: payload.message }) + '\nKeep the final answer short. Do not output reasoning or thinking tags. /no_think' },
    ...history,
    { role: 'user', content: JSON.stringify({ question: payload.message, currentPage: payload.pageContext, selectedText: payload.context, selectedPhotos: payload.selectedPhotos }) + '\n/no_think' },
  ];
}

// Some Qwen deployments include a leading <think> block in content instead
// of a separate reasoning field. Hold split tags and omit that block.
function answerText() {
  let pending = '', prefix = true, thinking = false;
  return (delta, flush = false) => {
    pending += delta;
    if (prefix) {
      const text = pending.trimStart();
      if (!flush && '<think>'.startsWith(text)) return '';
      thinking = text.startsWith('<think>');
      pending = thinking ? text.slice(7) : pending;
      prefix = false;
    }
    if (thinking) {
      const end = pending.indexOf('</think>');
      if (end === -1) return '';
      pending = pending.slice(end + 8).trimStart();
      thinking = false;
    }
    const text = pending; pending = ''; return text;
  };
}

async function readPayload(request) {
  if (Number(request.headers.get('Content-Length')) > BODY_LIMIT) throw Object.assign(new Error('Request too large.'), { status: 413 });
  if (!request.body) throw new Error('Please send a question.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > BODY_LIMIT) throw Object.assign(new Error('Request too large.'), { status: 413 });
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('Invalid JSON.'); }
  return validatePayload(body);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/chat') return new Response('Not found', { status: 404 });
    const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
    const json = (status, error) => Response.json({ error }, { status, headers });
    const origin = request.headers.get('Origin');
    const allowed = new Set((env.ALLOWED_ORIGINS || 'https://www.blairsu.design,https://blairsu.design').split(',').map(value => value.trim()));
    if (origin && !allowed.has(origin)) return json(403, 'This origin is not allowed.');
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    if (request.method !== 'POST') return new Response('Use POST to send a question.', { status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' } });
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json(415, 'Please send JSON.');
    let payload;
    try { payload = await readPayload(request); }
    catch (error) { return json(error.status || 400, error.message); }
    if (env.AI_ENABLED !== 'true' || !env.AI || !env.CHAT_RATE_LIMITER) return faqResponse(payload, headers);

    try {
      // Cloudflare's binding is a per-location abuse throttle, not a global
      // billing cap. The account must stay on Workers Free for zero overage.
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${new Date().toISOString().slice(0, 10)}:${ip}`));
      const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (!(await env.CHAT_RATE_LIMITER.limit({ key })).success) return faqResponse(payload, headers);
    } catch { return faqResponse(payload, headers); }

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 40000);
    let iterator;
    const stop = () => { abort.abort(); void iterator?.return().catch(() => {}); };
    request.signal.addEventListener('abort', stop, { once: true });
    const cleanup = () => { clearTimeout(timeout); request.signal.removeEventListener('abort', stop); };
    const aborted = new Promise((_, reject) => abort.signal.addEventListener('abort', () => reject(new Error('Reply interrupted.')), { once: true }));
    // Always observe the rejection, including while downstream is cancelled.
    aborted.catch(() => {});
    try {
      if (request.signal.aborted) throw new Error('Request cancelled.');
      const pending = env.AI.run(MODEL, { messages: cloudflareMessages(payload), stream: true, max_tokens: 600, temperature: .3 });
      // If the connection timed out before inference started streaming, cancel
      // its late-arriving stream instead of leaving it unconsumed.
      Promise.resolve(pending).then(stream => { if (abort.signal.aborted) return stream?.cancel?.().catch(() => {}); }).catch(() => {});
      const upstream = await Promise.race([pending, aborted]);
      if (!upstream?.getReader) throw new Error('No response stream.');
      iterator = readSSE(upstream.pipeThrough(new TransformStream(), { signal: abort.signal }))[Symbol.asyncIterator]();
      let closed = false;
      const body = new ReadableStream({
        async start(controller) {
          let text = '', completed = false;
          const clean = answerText();
          const send = value => { if (!closed) controller.enqueue(encoder.encode(event(value))); };
          const append = delta => { if (delta) { text += delta; if (text.length > 12000) throw new Error('Reply too long.'); send({ delta }); } };
          try {
            while (!closed) {
              const { value, done } = await Promise.race([iterator.next(), aborted]);
              if (done) break;
              if (value === '[DONE]') { completed = true; break; }
              const data = JSON.parse(value);
              if (data.error || data.success === false) throw new Error('AI unavailable.');
              const choice = data.choices?.[0];
              if (choice?.finish_reason && choice.finish_reason !== 'stop') throw new Error('Reply incomplete.');
              const delta = typeof data.response === 'string' ? data.response : choice?.delta?.content;
              if (typeof delta === 'string') append(clean(delta));
              if (choice?.finish_reason === 'stop') { completed = true; break; }
            }
            append(clean('', true));
            if (!completed || !text.trim()) throw new Error('Reply incomplete.');
            send('[DONE]');
          } catch {
            if (!closed && !request.signal.aborted) {
              if (text.trim()) send({ error: 'The reply was interrupted. Please try again.' });
              else { send({ mode: 'faq' }); send({ delta: fallbackAnswer(payload).content }); send('[DONE]'); }
            }
          } finally {
            cleanup();
            void iterator.return().catch(() => {});
            if (!closed) { closed = true; controller.close(); }
          }
        },
        cancel() { closed = true; stop(); cleanup(); },
      });
      return new Response(body, { headers: { ...headers, ...streamHeaders } });
    } catch {
      cleanup(); stop();
      return request.signal.aborted ? new Response(null, { status: 499 }) : faqResponse(payload, headers);
    }
  },
};
