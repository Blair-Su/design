// Keep a single, fixed-size head/body drawing throughout a walk. Only the legs
// articulate; their four staggered contacts follow a slow walking cadence.
export function drawFoxWalk(ctx, image, { unit, width, height, cycle = 0, amount = 0, direction = 'left' }) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height - unit * .04);
  if (direction === 'right') ctx.scale(-1, 1);
  const scale = unit * .633 / 350;
  ctx.scale(scale, scale);
  ctx.translate(-324, -560);
  const ink = '#0c0b09';
  const smooth = t => t * t * (3 - 2 * t);
  function leg(hipX, hipY, footX, phase, rear, far) {
    const p = ((cycle + phase) % 1 + 1) % 1;
    const swing = p >= .64;
    const swingProgress = (p - .64) / .36;
    const stride = swing ? 27 - 54 * smooth(swingProgress) : -27 + 54 * p / .64;
    const lift = swing ? 17 * Math.sin(Math.PI * swingProgress) : 0;
    const x = footX + stride * amount, y = 560 - lift * amount;
    const kneeX = hipX + (x - hipX) * .52 + (rear ? -12 : 5);
    const kneeY = hipY + (y - hipY) * .50;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(kneeX, kneeY, x, y - 23);
    ctx.strokeStyle = ink; ctx.lineWidth = far ? 43 : 49; ctx.stroke();
    ctx.strokeStyle = far ? '#ec790b' : '#ff870b'; ctx.lineWidth = far ? 28 : 34; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - 3, y - 17, far ? 25 : 29, 17, 0, 0, Math.PI * 2);
    ctx.fillStyle = far ? '#eee4d4' : '#fff3e1'; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.stroke();
    for (const toe of [-11, 2]) {
      ctx.beginPath(); ctx.moveTo(x + toe, y - 18); ctx.lineTo(x + toe - 2, y - 5);
      ctx.lineWidth = 5; ctx.stroke();
    }
  }
  // Far legs are partly concealed by the body; near legs don't cross each other.
  leg(252, 426, 253, .50, false, true);
  leg(408, 426, 420, .75, true, true);
  leg(202, 409, 198, 0, false, false);
  leg(371, 416, 376, .25, true, false);

  // Clip just the body, head, and tail from the first approved walking frame.
  // This leaves the original face intact and removes the baked-in leg poses.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(30, 80); ctx.lineTo(620, 80); ctx.lineTo(620, 502);
  ctx.lineTo(525, 502); ctx.lineTo(487, 486); ctx.quadraticCurveTo(451, 457, 421, 451);
  ctx.quadraticCurveTo(363, 481, 293, 477);
  ctx.quadraticCurveTo(255, 482, 230, 457);
  ctx.lineTo(185, 439); ctx.lineTo(136, 456); ctx.lineTo(131, 374);
  ctx.lineTo(30, 374); ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  ctx.restore();
}
