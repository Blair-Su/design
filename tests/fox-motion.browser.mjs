import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4187';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(base);
  await page.locator('.fox-avatar').waitFor();
  await page.evaluate(() => { const image = new Image(); image.src = '/assets/chat/fox-pixel-approved.png'; return image.decode(); });
  const samples = await page.locator('.fox-avatar').evaluate(svg => {
    svg.pauseAnimations();
    return [0, .6, 1.2, 1.8, 2.4, 3, 3.6, 4.2, 4.8].map(time => {
      svg.setCurrentTime(time);
      const matrix = selector => { const m = svg.querySelector(selector).getCTM(); return [m.a,m.b,m.c,m.d,m.e,m.f]; };
      return { body: matrix('.fox-body'), tail: matrix('.fox-tail'), bounds: JSON.stringify(svg.getBoundingClientRect()) };
    });
  });
  assert.ok(new Set(samples.map(s => JSON.stringify(s.tail))).size > 4, 'tail rotates through a gentle cycle');
  assert.equal(new Set(samples.map(s => JSON.stringify(s.body))).size, 1, 'body must never move or scale');
  assert.equal(new Set(samples.map(s => s.bounds)).size, 1, 'avatar position/size must remain fixed');
  assert.equal(await page.locator('.fox-avatar animateTransform').count(), 1);
  const motion = await page.locator('.fox-avatar').evaluate(svg => {
    const angle = time => {
      svg.setCurrentTime(time);
      const matrix = svg.querySelector('.fox-tail').getCTM();
      return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    };
    const dt = 1 / 60;
    return {
      centers: [2.4, 4.8].map(t => [angle(t) - angle(t - dt), angle(t + dt) - angle(t)]),
      turn: [angle(1.2) - angle(1.2 - dt), angle(1.2 + dt) - angle(1.2)],
      rendering: getComputedStyle(svg.querySelector('.fox-tail image')).imageRendering,
    };
  });
  for (const [before, after] of motion.centers) {
    assert.ok(Math.abs(before) > .05 && Math.abs(after) > .05, 'no hesitation crossing the center or loop seam');
    assert.ok(before * after > 0 && Math.abs(before - after) < .002, 'center velocity stays continuous');
  }
  assert.ok(motion.turn[0] > 0 && motion.turn[1] < 0 && motion.turn.every(step => Math.abs(step) < .003), 'tail slows only at its turn');
  assert.equal(motion.rendering, 'auto', 'moving tail uses subpixel interpolation');
  // Rasterize snapshots of the same image layers to catch clipped tips, stray
  // background/checkerboard, or movement accidentally affecting the face/body.
  const raster = await page.locator('.fox-avatar').evaluate(async svg => {
    const bytes = new Uint8Array(await (await fetch('/assets/chat/fox-pixel-approved.png')).arrayBuffer());
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    const png = `data:image/png;base64,${btoa(binary)}`;
    const canv = document.createElement('canvas'); canv.width = canv.height = 300;
    const ctx = canv.getContext('2d'); const results = []; let first;
    for (const angle of [0, 8, 4, -8, -4]) {
      const clone = svg.cloneNode(true);
      clone.querySelector('animateTransform').remove();
      clone.querySelector('.fox-tail').setAttribute('transform', `rotate(${angle} 842 1105)`);
      clone.querySelectorAll('image').forEach(image => image.setAttribute('href', png));
      const image = new Image(); image.src = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(clone))}`; await image.decode();
      ctx.clearRect(0,0,300,300); ctx.drawImage(image,0,0,300,300);
      const pixels = ctx.getImageData(0,0,300,300).data;
      let stable = true, edgeClear = true, changed = 0;
      for (let y=0;y<300;y++) for (let x=0;x<300;x++) {
        const i=(y*300+x)*4;
        if (pixels[i+3]>100 && (x<5 || y<5 || x>=295 || y>=295)) edgeClear=false;
        if (first) for(let c=0;c<4;c++) if(pixels[i+c]!==first[i+c]) {
          changed++;
          if (x<165 || y<155) stable=false;
        }
      }
      if (!first) first=pixels;
      results.push({angle,stable,edgeClear,changed});
    }
    return results;
  });
  assert.ok(raster.every(r => r.stable), 'head, face, and seated body pixels stay fixed');
  assert.ok(raster.every(r => r.edgeClear), 'tail remains inside its transparent safety margin');
  assert.ok(raster.slice(1).every(r => r.changed>0));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.fox-pet').classList.contains('is-reduced'));
  assert.equal(await page.locator('.fox-avatar').evaluate(svg => svg.animationsPaused()), true);
  assert.equal(await page.locator('.fox-avatar').evaluate(svg => svg.getCurrentTime()), 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => !document.querySelector('.fox-pet').classList.contains('is-reduced'));
  assert.equal(await page.locator('.fox-avatar').evaluate(svg => svg.animationsPaused()), false);
  for (const size of [{width:1440,height:1000},{width:390,height:844},{width:320,height:568}]) {
    await page.setViewportSize(size);
    const bounds = await page.locator('.fox-pet').boundingBox();
    assert.ok(bounds.x>=0 && bounds.x+bounds.width<=size.width && bounds.y+bounds.height<=size.height);
    assert.equal(await page.locator('.fox-pet').evaluate(el=>getComputedStyle(el).overflow), 'visible');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), true);
  }
  console.log('Tail-only checks passed: continuous center/loop velocity, gentle reversals, subpixel edges, fixed body, no clipping, reduced motion and desktop/phone bounds.');
} finally { await browser.close(); }
