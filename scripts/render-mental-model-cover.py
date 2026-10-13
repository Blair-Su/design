"""Mount the Ear to Mind film in the Cube.AI card's monitor geometry.

Requires Pillow and ffmpeg. The input film is unchanged. Outputs a looping
960×540 GIF and a static PNG for visitors who prefer reduced motion.
"""
import argparse
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/case-studies/mental-model'
W, H, SCALE, FPS = 960, 540, 2, 12
SCREEN = (184, 86, 776, 419)  # Same 16:9 screen and placement as Cube.AI.


def monitor():
    image = Image.new('RGB', (W * SCALE, H * SCALE), '#000000')
    draw = ImageDraw.Draw(image)

    def box(bounds, fill, radius=0, outline=None, width=1):
        draw.rounded_rectangle(tuple(round(v * SCALE) for v in bounds),
                               radius=round(radius * SCALE), fill=fill,
                               outline=outline, width=round(width * SCALE))

    for y in range(493, H):
        shade = round(162 + (y - 493) / (H - 493) * 32)
        box((406, y, 554, y + 1), (shade, shade, shade))
    box((170, 72, 790, 496), '#edeef0', 11)
    box((183, 85, 777, 420), '#ffffff', outline='#acafb3', width=.6)
    box(SCREEN, '#191919')
    box((170, 433, 790, 496), '#d5d6d7', 11)
    box((170, 433, 790, 479), '#d5d6d7')
    box((477.8, 76, 482.2, 80.4), '#5c5e63', 2.2)
    return image.resize((W, H), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    x, y, right, bottom = SCREEN
    sw, sh = right - x, bottom - y
    result = subprocess.run([
        args.ffmpeg, '-hide_banner', '-loglevel', 'error',
        '-i', str(OUT / 'mental-model-promo.mp4'), '-an',
        '-vf', f'fps={FPS},scale={sw}:{sh}:flags=lanczos',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ], check=True, stdout=subprocess.PIPE)
    frame_bytes = sw * sh * 3
    assert len(result.stdout) % frame_bytes == 0
    base = monitor()
    base.save(OUT / 'mental-model-monitor-frame.png', optimize=True)
    frames = []
    for offset in range(0, len(result.stdout), frame_bytes):
        frame = base.copy()
        screen = Image.frombytes('RGB', (sw, sh), result.stdout[offset:offset + frame_bytes])
        frame.paste(screen, (x, y))
        frames.append(frame)
    assert frames, 'The film must produce at least one frame.'

    # One shared palette avoids shimmer in the fixed monitor and fine UI text.
    samples = frames[::FPS] + [frames[-1]]
    palette_source = Image.new('RGB', (W, H * len(samples)))
    for i, frame in enumerate(samples):
        palette_source.paste(frame, (0, i * H))
    palette = palette_source.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    # GIF timing is in 10 ms increments; alternate delays to preserve 12 fps.
    durations = [10 * (round((i + 1) * 100 / FPS) - round(i * 100 / FPS))
                 for i in range(len(frames))]
    indexed[0].save(OUT / 'mental-model-monitor.gif', save_all=True,
                    append_images=indexed[1:], duration=durations,
                    loop=0, disposal=1, optimize=True)
    frames[round(6.85 * FPS)].save(OUT / 'mental-model-monitor-poster.png', optimize=True)
    print(f'{len(frames)} frames, {sum(durations) / 1000:.2f}s, {W}×{H}')
    for name in ('mental-model-monitor.gif', 'mental-model-monitor-poster.png'):
        print(name, (OUT / name).stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
