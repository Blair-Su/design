import test from 'node:test';
import assert from 'node:assert/strict';
import { initAboutIntroPhotos } from '../about-intro-photos.js';

function setup({ decode = true } = {}) {
  const images = Array.from({ length: 4 }, (_, i) => ({ src: `data:image/webp;base64,preview${i}`, dataset: { fullSrc: `/photo-${i}.webp` } }));
  const requests = [];
  const doc = {
    querySelectorAll: () => [{ querySelectorAll: () => images }],
    createElement() {
      const request = {};
      if (decode) {
        const promise = new Promise((resolve, reject) => { request.resolve = resolve; request.reject = reject; });
        request.decode = () => promise;
      }
      requests.push(request);
      return request;
    },
  };
  const ready = initAboutIntroPhotos({ doc });
  return { images, requests, ready };
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('four inline photos stay visible while out-of-order downloads decode, then update together', async () => {
  const { images, requests, ready } = setup();
  assert.equal(requests.length, 4, 'all downloads start without a scroll or view event');
  for (const request of requests) assert.equal(request.fetchPriority, 'high');
  for (const index of [0, 3, 1]) requests[index].resolve();
  await flush();
  assert.ok(images.every(image => image.src.startsWith('data:image/webp;')), 'no individual image appears before the group is ready');
  requests[2].resolve();
  await ready;
  assert.deepEqual(images.map(image => image.src), ['/photo-0.webp', '/photo-1.webp', '/photo-2.webp', '/photo-3.webp']);
});

test('a failed full photo keeps its visible inline preview without blocking the other photos', async () => {
  const { images, requests, ready } = setup();
  requests[1].reject(new Error('Image unavailable'));
  [0, 2, 3].forEach(index => requests[index].resolve());
  await ready;
  assert.equal(images[1].src, 'data:image/webp;base64,preview1');
  [0, 2, 3].forEach(index => assert.equal(images[index].src, `/photo-${index}.webp`));
});

test('browsers without decode use load/error events and retain failed previews', async () => {
  const { images, requests, ready } = setup({ decode: false });
  requests[3].onerror(new Error('Image unavailable'));
  [2, 0, 1].forEach(index => requests[index].onload());
  await ready;
  assert.equal(images[3].src, 'data:image/webp;base64,preview3');
  [0, 1, 2].forEach(index => assert.equal(images[index].src, `/photo-${index}.webp`));
});
