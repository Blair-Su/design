import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import chatHandler from './server/chat-handler.js';
import cloudflareChatHandler from './server/cloudflare-preview.js';

// The optional local .env is loaded only on the server and is never served.
try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
// Keep local navigation on the latest case studies while drafts are present.
// The published static pages and homepage links remain independent of previews.
const localCasePreviews = new Map([
  ['/project-3-hhi', '/hhi-preview/'],
  ['/project-1-lighthouse', '/lighthouse-preview/'],
  ['/project-2-southerncrafted', '/southern-preview/'],
  ['/project-4-nalu', '/nalu-preview/'],
]);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/api/chat') { await (process.env.CHAT_PROVIDER === 'openai' ? chatHandler : cloudflareChatHandler)(req, res); return; }
    if (pathname.split('/').some(segment => segment.startsWith('.')) || /^\/(server|cloudflare|api|tests|scripts|reference|qa|node_modules)(\/|$)/.test(pathname) || /\.(?:mjs|jsonc?|md|toml|pem|key)$/.test(pathname)) {
      res.writeHead(404).end('Not found'); return;
    }
    const preview = localCasePreviews.get(pathname.replace(/\/(?:index\.html)?$/, ''));
    if (preview && await stat(path.join(root, preview, 'index.html')).then(info => info.isFile()).catch(() => false)) {
      res.writeHead(302, { Location: `${preview}${requestUrl.search}`, 'Cache-Control': 'no-store' }).end();
      return;
    }
    const filename = path.resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const info = await stat(filename);
    if (!info.isFile()) { res.writeHead(404).end('Not found'); return; }
    const headers = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      if (!range[1]) start = Math.max(0, info.size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = String(info.size ? end - start + 1 : 0);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || !info.size) { res.end(); return; }
    createReadStream(filename, { start, end }).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Blair portfolio: http://127.0.0.1:${port}\nDevice previews: http://127.0.0.1:${port}/preview.html`));
