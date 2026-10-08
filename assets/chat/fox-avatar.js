// The approved illustration is reused unchanged in two clipped layers. The
// tail overlaps behind the fixed body at its root so the attachment stays solid.
export function foxAvatar() {
  return `<svg class="fox-avatar" viewBox="-64 -64 1382 1382" width="96" height="96" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="fox-approved-body-clip" clipPathUnits="userSpaceOnUse">
        <path clip-rule="evenodd" d="M0 0H1254V1254H0Z M1026 730H1254V1254H810V1104H842V1042H904V790H1026Z"/>
      </clipPath>
      <clipPath id="fox-approved-tail-clip" clipPathUnits="userSpaceOnUse">
        <path d="M1026 730H1254V1254H780V1042H842V854H904V790H1026Z"/>
      </clipPath>
    </defs>
    <g class="fox-tail" clip-path="url(#fox-approved-tail-clip)">
      <image href="/assets/chat/fox-pixel-approved.png" width="1254" height="1254"/>
      <!-- Matching slopes carry motion through the center and loop seam.
           Only the two extremes have zero velocity. -->
      <animateTransform attributeName="transform" type="rotate" values="0 842 1105;8 842 1105;0 842 1105;-8 842 1105;0 842 1105" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".333333 .523599 .666667 1;.333333 0 .666667 .476401;.333333 .523599 .666667 1;.333333 0 .666667 .476401" dur="4.8s" repeatCount="indefinite"/>
    </g>
    <g class="fox-body" clip-path="url(#fox-approved-body-clip)">
      <image href="/assets/chat/fox-pixel-approved.png" width="1254" height="1254"/>
    </g>
  </svg>`;
}
