import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['lighthouse', 'project-1-lighthouse'],
  ['southern', 'project-2-southerncrafted'],
  ['hhi', 'project-3-hhi'],
  ['nalu', 'project-4-nalu'],
  ['cube', 'project-5-cube'],
];

// Approved drafts remain editable; GitHub Pages serves these canonical copies.
for (const [name, route] of pages) {
  const source = `${root}${name}-preview`;
  const target = `${root}${route}`;
  await mkdir(target, { recursive: true });
  const html = (await readFile(`${source}/index.html`, 'utf8'))
    .replace(/^\s*<meta name="robots" content="noindex, nofollow">\r?\n/m, '');
  await writeFile(`${target}/index.html`, html);
  for (const extension of ['css', 'js']) {
    await cp(`${source}/${name}.${extension}`, `${target}/${name}.${extension}`);
  }
  if (name === 'hhi' || name === 'cube') {
    await cp(`${source}/assets`, `${target}/assets`, { recursive: true });
  }
  if (name === 'cube') await cp(`${source}/card.css`, `${target}/card.css`);
}

console.log('Synced five approved case studies to their public routes.');
