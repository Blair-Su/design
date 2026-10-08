// Fixed pixel geometry inspired by the supplied cat references. The orange
// fox's ears, face, bib and paws never move; only the three tail drawings change.
export const FOX_PIXEL_SIZE = { width: 22, height: 16 };
export const FOX_PIXEL_PALETTE = { orange: '#f58220', shade: '#d86419', cream: '#fff3db', ink: '#271b20' };
export const FOX_PIXEL_BODY = [
  // Seated body and white bib.
  [9, 9, 6, 5, 'orange'], [8, 11, 2, 3, 'orange'],
  [8, 13, 2, 1, 'shade'], [10, 9, 4, 1, 'cream'],
  [11, 10, 3, 1, 'cream'], [12, 11, 1, 1, 'cream'],
  [10, 13, 1, 1, 'cream'], [14, 13, 1, 1, 'cream'],
  // Pointed, stepped ears and a flat, uncluttered face.
  [8, 2, 1, 3, 'orange'], [9, 3, 1, 2, 'orange'],
  [15, 2, 1, 3, 'orange'], [14, 3, 1, 2, 'orange'],
  [8, 4, 8, 4, 'orange'], [7, 7, 10, 1, 'orange'],
  [8, 8, 8, 1, 'cream'], [8, 7, 3, 1, 'cream'], [14, 7, 2, 1, 'cream'],
  [9, 4, 1, 1, 'shade'], [14, 4, 1, 1, 'shade'],
  [10, 6, 1, 1, 'ink'], [14, 6, 1, 1, 'ink'], [12, 8, 1, 1, 'ink'],
];
export const FOX_PIXEL_TAILS = [
  [[6, 10, 3, 3, 'orange'], [4, 9, 3, 3, 'orange'], [3, 8, 3, 2, 'orange'], [2, 7, 2, 2, 'cream'], [5, 12, 3, 1, 'shade']],
  [[6, 10, 3, 3, 'orange'], [4, 8, 3, 4, 'orange'], [3, 6, 3, 3, 'orange'], [3, 5, 2, 2, 'cream'], [3, 7, 1, 1, 'cream'], [5, 12, 3, 1, 'shade']],
  [[6, 10, 3, 3, 'orange'], [4, 7, 3, 5, 'orange'], [4, 5, 2, 3, 'orange'], [4, 4, 2, 2, 'cream'], [4, 6, 1, 1, 'cream'], [5, 12, 3, 1, 'shade']],
];
const rects = cells => cells.map(([x, y, width, height, color]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${FOX_PIXEL_PALETTE[color]}"/>`).join('');
export function pixelFoxSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="fox-pixel-art" viewBox="0 0 22 16" width="110" height="80" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <style>
      .fox-tail-frame { animation-duration: 2.8s; animation-timing-function: steps(1, end); animation-iteration-count: infinite; }
      .fox-tail-0 { animation-name: fox-pixel-tail-0; }
      .fox-tail-1 { opacity: 0; animation-name: fox-pixel-tail-1; }
      .fox-tail-2 { opacity: 0; animation-name: fox-pixel-tail-2; }
      @keyframes fox-pixel-tail-0 { 0%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }
      @keyframes fox-pixel-tail-1 { 0%, 50%, 100% { opacity: 0; } 25%, 75% { opacity: 1; } }
      @keyframes fox-pixel-tail-2 { 0%, 25%, 75%, 100% { opacity: 0; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .fox-tail-frame { animation: none !important; } }
    </style>
    ${FOX_PIXEL_TAILS.map((cells, index) => `<g class="fox-tail-frame fox-tail-${index}">${rects(cells)}</g>`).join('')}
    <g class="fox-pixel-body">${rects(FOX_PIXEL_BODY)}</g>
  </svg>`;
}
