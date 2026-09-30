import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
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
