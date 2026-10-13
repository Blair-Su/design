"""Fill the homepage card with the Ear to Mind film, without a device mockup.

The film and the existing card frame share a 16:9 aspect ratio, so no crop,
padding, or distortion is needed. Requires Pillow and ffmpeg. Outputs a
looping 960×540 GIF and a static PNG for reduced motion.
"""
import argparse
from pathlib import Path
import subprocess

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/case-studies/mental-model'
W, H, FPS = 960, 540, 12


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    result = subprocess.run([
        args.ffmpeg, '-hide_banner', '-loglevel', 'error',
        '-i', str(OUT / 'mental-model-promo.mp4'), '-an',
        '-vf', f'fps={FPS},scale={W}:{H}:flags=lanczos',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ], check=True, stdout=subprocess.PIPE)
    frame_bytes = W * H * 3
    assert len(result.stdout) % frame_bytes == 0
    frames = []
    for offset in range(0, len(result.stdout), frame_bytes):
        frames.append(Image.frombytes('RGB', (W, H), result.stdout[offset:offset + frame_bytes]))
    assert frames, 'The film must produce at least one frame.'

    # One shared palette keeps the fine UI text and backgrounds stable.
    samples = frames[::FPS] + [frames[-1]]
    palette_source = Image.new('RGB', (W, H * len(samples)))
    for i, frame in enumerate(samples):
        palette_source.paste(frame, (0, i * H))
    palette = palette_source.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    # GIF timing is in 10 ms increments; alternate delays to preserve 12 fps.
    durations = [10 * (round((i + 1) * 100 / FPS) - round(i * 100 / FPS))
                 for i in range(len(frames))]
    indexed[0].save(OUT / 'ear-to-mind-cover.gif', save_all=True,
                    append_images=indexed[1:], duration=durations,
                    loop=0, disposal=1, optimize=True)
    frames[round(6.85 * FPS)].save(OUT / 'ear-to-mind-cover-poster.png', optimize=True)
    print(f'{len(frames)} frames, {sum(durations) / 1000:.2f}s, {W}×{H}')
    for name in ('ear-to-mind-cover.gif', 'ear-to-mind-cover-poster.png'):
        print(name, (OUT / name).stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
