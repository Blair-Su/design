import { readSSE } from '../assets/chat/core.js';
import { rateLimit } from './rate-limit.js';
import { BODY_LIMIT, validatePayload, buildInstructions } from './chat-shared.js';
export { validatePayload, buildInstructions } from './chat-shared.js';

class RequestError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
async function readBody(req) {
  if (Number(req.headers['content-length']) > BODY_LIMIT) throw new RequestError('Request too large.', 413);
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? String(req.body) : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > BODY_LIMIT) throw new RequestError('Request too large.', 413);
    try { return JSON.parse(raw); } catch { throw new RequestError('Invalid JSON.'); }
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT) throw new RequestError('Request too large.', 413);
    // Collect bytes before decoding, including multi-byte Chinese characters.
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError('Invalid JSON.'); }
}
function json(res, status, message) {
  if (!res.destroyed) res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: message }));
}
export function createChatHandler({ env = process.env, fetchImpl = fetch, limit = rateLimit } = {}) {
  return async function chat(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const allowed = new Set((env.ALLOWED_ORIGINS || 'https://www.blairsu.design,https://blairsu.design').split(',').map(v => v.trim()));
    for (const hostname of [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) if (hostname) allowed.add(`https://${hostname}`);
    const origin = req.headers.origin;
    const local = !env.VERCEL && env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (origin && !allowed.has(origin) && !local) return json(res, 403, 'This origin is not allowed.');
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }).end(); return; }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return json(res, 405, 'Use POST to send a question.'); }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(res, 415, 'Please send JSON.');
    let payload;
    try { payload = validatePayload(await readBody(req)); }
    catch (error) { return json(res, error.status || 400, error.message); }
    if (!env.OPENAI_API_KEY) return json(res, 503, 'My AI connection is still being set up. You can explore the projects or email Blair in the meantime.');
    try {
      const quota = await limit(req, env, fetchImpl);
      if (!quota.allowed) { res.setHeader('Retry-After', String(quota.retryAfter)); return json(res, 429, `This little fox needs a breather. Please try again in ${Math.ceil(quota.retryAfter / 60)} minute(s).`); }
    } catch { return json(res, 503, 'I’m taking a short break. Please try again later.'); }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const disconnect = () => controller.abort();
    res.on('close', disconnect);
    const send = data => { if (!res.destroyed) res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`); };
    try {
      const input = [...payload.conversationHistory, { role: 'user', content: JSON.stringify({ question: payload.message, currentPage: payload.pageContext, selectedText: payload.context, selectedPhotos: payload.selectedPhotos }) }];
      const upstream = await fetchImpl('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4.1-mini', instructions: buildInstructions(payload.pageContext), input, stream: true, store: false, max_output_tokens: 1000 }), signal: controller.signal });
      if (!upstream.ok || !upstream.body) {
        await upstream.body?.cancel();
        return json(res, upstream.status === 429 ? 429 : 502, upstream.status === 429 ? 'My AI connection is busy. Please try again shortly.' : 'I couldn’t reach my AI connection. Please try again later.');
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      res.flushHeaders?.();
      let completed = false;
      for await (const raw of readSSE(upstream.body)) {
        if (raw === '[DONE]') break;
        const event = JSON.parse(raw);
        if (event.type === 'response.output_text.delta' || event.type === 'response.refusal.delta') send({ delta: event.delta });
        if (event.type === 'response.completed') { completed = true; break; }
        if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) throw new Error('Incomplete upstream response.');
      }
      if (!completed) throw new Error('Stream ended early.');
      send('[DONE]');
      res.end();
    } catch {
      if (!res.destroyed) {
        if (res.headersSent) { send({ error: 'The reply was interrupted. Please try again.' }); res.end(); }
        else json(res, 502, 'I couldn’t finish that reply. Please try again.');
      }
    } finally { clearTimeout(timeout); res.off('close', disconnect); controller.abort(); }
  };
}
export default createChatHandler();
