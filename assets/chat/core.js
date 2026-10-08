import { photos } from './catalog.js';

// Both the browser and the server use the same incremental UTF-8/SSE decoder.
export async function* readSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', data = [];
  function line(value) {
    if (value.endsWith('\r')) value = value.slice(0, -1);
    if (!value) { const event = data.length ? data.join('\n') : null; data = []; return event; }
    if (value.startsWith('data:')) data.push(value.slice(5).replace(/^ /, ''));
    return null;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const event = line(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
        if (event !== null) yield event;
      }
      if (buffer.length + data.join('').length > 262144) throw new Error('Stream event is too large.');
      if (done) {
        if (buffer) line(buffer);
        if (data.length) yield data.join('\n');
        break;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function safeURL(value) {
  if (/[\s\u0000-\u001f\\]/.test(value)) return null;
  if (/^\/(?!\/)/.test(value)) return value;
  if (/^https:\/\//i.test(value)) { try { return new URL(value).href; } catch { return null; } }
  if (value === 'mailto:suxun70@gmail.com') return value;
  return null;
}
export function stableText(text, streaming) {
  if (!streaming) return text;
  // Hold an unfinished link, image token or Markdown image until it is complete.
  const open = text.lastIndexOf('[');
  if (open >= 0) {
    const tail = text.slice(open);
    if (!tail.includes(']') || /^\[[^\]]*\](?:\([^)]*)?$/.test(tail)) return text.slice(0, text[open - 1] === '!' ? open - 1 : open);
  }
  return text;
}
function inline(text) {
  let output = '', offset = 0;
  const tokens = /!?\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  for (const match of text.matchAll(tokens)) {
    output += escapeHTML(text.slice(offset, match.index));
    if (match[1]) {
      const href = safeURL(match[2]);
      output += href ? `<a href="${escapeHTML(href)}"${href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHTML(match[1])}</a>` : escapeHTML(match[1]);
    } else if (match[3]) output += `<strong>${escapeHTML(match[3])}</strong>`;
    else output += `<code>${escapeHTML(match[4])}</code>`;
    offset = match.index + match[0].length;
  }
  return output + escapeHTML(text.slice(offset));
}
export function renderAnswer(text, streaming = false) {
  const ids = [];
  const clean = stableText(text, streaming).replace(/\[IMAGE:([\w-]+)\]/g, (_, id) => {
    if (Object.hasOwn(photos, id) && !ids.includes(id) && ids.length < 2) ids.push(id);
    return '';
  });
  const markup = clean.split(/\n\s*\n/).filter(Boolean).map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^\s*[-*] /.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(line => inline(line.replace(/^#{1,6}\s+/, ''))).join('<br>')}</p>`;
  }).join('');
  return markup + ids.map(id => {
    const photo = photos[id];
    return `<figure class="fox-photo"><a href="${photo.href}"><img src="${photo.src}" alt="${escapeHTML(photo.alt)}" loading="lazy"><figcaption>${escapeHTML(photo.title)}</figcaption></a><button type="button" data-photo="${id}">Ask about this</button></figure>`;
  }).join('');
}
