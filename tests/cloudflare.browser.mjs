import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createCloudflarePreviewHandler } from '../server/cloudflare-preview.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4187';
// Explicitly unconfigured adapter: never use a deployed AI endpoint in this
// regression suite, even when the developer has connected their own account.
const faqServer = createServer(createCloudflarePreviewHandler({ env: { ALLOWED_ORIGINS: new URL(base).origin } }));
await new Promise(resolve => faqServer.listen(0, '127.0.0.1', resolve));
const faqEndpoint = `http://127.0.0.1:${faqServer.address().port}/api/chat`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.route('**/assets/chat/config.js', route => route.fulfill({ contentType: 'text/javascript', body: `export const CHAT_ENDPOINT = ${JSON.stringify(faqEndpoint)};` }));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('qa', { recursive: true });
const reset = () => page.getByRole('button', { name: 'Reset chat', exact: true }).click();
const send = async question => {
  await page.locator('.fox-form textarea').fill(question);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
};
const finished = () => page.waitForFunction(() => !document.querySelector('.fox-form textarea').disabled);

try {
  // Exercise the actual Node adapter and Worker in unconfigured preview mode.
  await page.goto(base);
  await page.locator('.fox-pet').click();
  await send('What is Lighthouse?');
  await finished();
  assert.match(await page.locator('.fox-faq-note').innerText(), /saved portfolio answer/);
  assert.equal(await page.locator('.fox-assistant .fox-author').innerText(), 'Portfolio FAQ');
  assert.match(await page.locator('.fox-assistant .fox-answer').innerText(), /student team concept/);
  await page.screenshot({ path: 'qa/cloudflare-faq-desktop.png' });
  await page.getByRole('button', { name: 'About this chat', exact: true }).click();
  assert.match(await page.locator('.fox-privacy').innerText(), /processed by Cloudflare/);
  await page.screenshot({ path: 'qa/cloudflare-privacy-desktop.png' });
  await page.reload();
  await page.locator('.fox-pet').click();
  assert.equal(await page.locator('.fox-faq-note').count(), 1);

  // Persisted saved answers must not become model history.
  let payload;
  await page.route('**/api/chat', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ contentType: 'text/event-stream', body: 'data: {"delta":"A test AI reply."}\n\ndata: [DONE]\n\n' });
  });
  await send('What is HHI?'); await finished();
  assert.deepEqual(payload.conversationHistory, []);
  assert.equal(await page.locator('.fox-assistant').last().locator('.fox-author').innerText(), 'Little fox');
  await page.unroute('**/api/chat');

  // Real Chinese fallback and phone layout, including the provider notice.
  await reset();
  await page.setViewportSize({ width: 390, height: 844 });
  await send('怎么联系 Blair？'); await finished();
  assert.match(await page.locator('.fox-faq-note').innerText(), /预先整理/);
  assert.equal(await page.locator('.fox-assistant a').first().getAttribute('href'), 'mailto:suxun70@gmail.com');
  const bounds = await page.locator('.fox-panel').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: 'qa/cloudflare-faq-phone.png' });
  await page.getByRole('button', { name: 'About this chat', exact: true }).click();
  const privacy = await page.locator('.fox-privacy').boundingBox();
  assert.ok(privacy.x >= 0 && privacy.x + privacy.width <= 390 && privacy.y + privacy.height <= 844);
  await page.screenshot({ path: 'qa/cloudflare-privacy-phone.png' });
  await page.keyboard.press('Escape');

  for (const mode of ['quota', 'offline']) {
    await reset();
    await page.route('**/api/chat', route => mode === 'quota'
      ? route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"Limit reached"}' })
      : route.abort('internetdisconnected'));
    await send('How can I contact Blair?'); await finished();
    assert.equal(await page.locator('.fox-faq-note').count(), 1);
    assert.equal(await page.locator('.fox-error').isVisible(), false);
    await page.unroute('**/api/chat');
  }

  // An explicit user stop must not turn into a saved answer.
  await reset();
  let release, received;
  const pending = new Promise(resolve => { received = resolve; });
  await page.route('**/api/chat', async route => {
    received();
    await new Promise(resolve => { release = resolve; });
    await route.abort().catch(() => {});
  });
  await send('Tell me about Blair.'); await pending;
  await page.getByRole('button', { name: 'Stop reply', exact: true }).click();
  await finished(); release();
  assert.equal(await page.locator('.fox-faq-note').count(), 0);
  assert.equal(await page.locator('.fox-interrupted').count(), 1);
  assert.equal(await page.locator('.fox-error').isVisible(), false);
  await page.unroute('**/api/chat');

  // Partial AI text survives a dropped stream and is explicitly incomplete.
  await reset();
  await page.route('**/api/chat', route => route.fulfill({ contentType: 'text/event-stream', body: 'data: {"delta":"Partial answer about Blair"}\n\n' }));
  await send('Tell me about Blair.'); await finished();
  assert.match(await page.locator('.fox-assistant .fox-answer').innerText(), /Partial answer/);
  assert.equal(await page.locator('.fox-faq-note').count(), 0);
  assert.equal(await page.locator('.fox-interrupted').count(), 1);
  assert.equal(await page.locator('.fox-error').isVisible(), true);

  for (const path of ['/cloudflare/worker.js', '/server/cloudflare-preview.js', '/wrangler.jsonc', '/.dev.vars', '/.env']) {
    assert.equal((await page.request.get(base + path)).status(), 404);
  }
  assert.deepEqual(errors, []);
  console.log('Cloudflare browser checks passed: real local FAQ, clear labels, persistence, private paths, Chinese, phone, quota, offline, stop and interrupted streams.');
} finally {
  await browser.close();
  faqServer.closeAllConnections();
  await new Promise(resolve => faqServer.close(resolve));
}
