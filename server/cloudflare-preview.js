import { Readable } from 'node:stream';
import worker from '../cloudflare/worker.js';

// No remote URL means the real Worker runs with AI disabled: a clearly
// labelled FAQ preview, not simulated model output or an OpenAI paid fallback.
export function createCloudflarePreviewHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 45000);
    const stop = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', stop);
    try {
      const remote = env.CLOUDFLARE_CHAT_URL;
      if (remote && (!/^https:\/\/[^/]+\.workers\.dev\/api\/chat$/.test(remote))) throw new Error('Invalid Worker endpoint.');
      const target = remote || `http://127.0.0.1/api/chat`;
      const headers = new Headers({ 'Content-Type': req.headers['content-type'] || '' });
      for (const name of ['origin', 'content-length']) if (req.headers[name]) headers.set(name, req.headers[name]);
      const request = new Request(target, {
        method: req.method, headers, signal: abort.signal,
        ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
      });
      const response = remote ? await fetchImpl(request) : await worker.fetch(request, {
        AI_ENABLED: 'false',
        ALLOWED_ORIGINS: `${env.ALLOWED_ORIGINS || 'https://www.blairsu.design,https://blairsu.design'},http://127.0.0.1:${env.PORT || 4173},http://localhost:${env.PORT || 4173}`,
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.flushHeaders?.();
      if (response.body) for await (const chunk of response.body) {
        if (abort.signal.aborted) break;
        res.write(chunk);
      }
      if (!res.destroyed) res.end();
    } catch {
      if (!res.destroyed) {
        if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'AI is temporarily unavailable.' }));
        else res.end();
      }
    } finally { clearTimeout(timeout); res.off('close', stop); }
  };
}
export default createCloudflarePreviewHandler();
