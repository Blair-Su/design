"""Build the Section 3 lock-screen loop from Figma screen exports.

The source frames are exported at 4x. Timer screens include shadow pixels
outside the 393 x 852 canvas, so center-crop them before resizing. Each screen
replaces the previous one in full; there is no tap cue or blended overlap.
"""

from pathlib import Path

from PIL import Image


ASSETS = Path(__file__).resolve().parents[1] / "assets/case-studies/lighthouse-storyboard"
SCREEN_SIZE = (590, 1278)
CANVAS_WIDTH = 1575
FRAME_DURATION_MS = (2800, 2800, 3400)


def load_screen(number: int) -> Image.Image:
    with Image.open(ASSETS / f"screen-{number}.png") as source:
        canvas_width = min(source.width, CANVAS_WIDTH)
        excess = source.width - canvas_width
        if excess > 0:
            left = excess // 2
            source = source.crop((left, 0, left + canvas_width, source.height))
        frame = source.resize(SCREEN_SIZE, Image.Resampling.LANCZOS).convert("RGB")
    return frame.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


frames = [load_screen(number) for number in (17, 18, 19)]
frames[0].save(
    ASSETS / "post-meal-lock-screen.gif",
    save_all=True,
    append_images=frames[1:],
    duration=FRAME_DURATION_MS,
    disposal=2,
    loop=0,
    optimize=False,
)
