import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import './sync-case-previews.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = `${root}public-dist`;
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
// Only browser assets are published. Server modules, credentials, tests and references stay out.
for (const entry of await readdir(root, { withFileTypes: true })) {
  const publicDirectory = entry.isDirectory() && (entry.name === 'assets' || entry.name === 'cube' || /^project-\d-/.test(entry.name));
  const publicFile = entry.isFile() && /\.(html|css|js)$/.test(entry.name) && entry.name !== 'preview.html';
  if (publicDirectory || publicFile) await cp(`${root}${entry.name}`, `${target}/${entry.name}`, { recursive: true });
}
console.log('Public site prepared in public-dist. Deploy the Cloudflare chat Worker separately and set its verified URL in assets/chat/config.js.');
