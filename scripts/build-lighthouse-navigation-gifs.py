"""Build the Lighthouse storyboard loops from the exported Figma screens.

Run with a Python environment that has Pillow installed. Each transition is a
clean screen replacement; the brief tap cue mirrors Figma's prototype cursor.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ASSETS = Path(__file__).resolve().parents[1] / "assets/case-studies/lighthouse-storyboard"
SIZE = (590, 1278)


def screen(number):
    with Image.open(ASSETS / f"screen-{number}.png") as source:
        return source.convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)


def with_tap(image, center, radius):
    frame = image.copy()
    overlay = Image.new("RGBA", SIZE)
    shadow = Image.new("RGBA", SIZE)
    draw = ImageDraw.Draw(shadow)
    x, y = center
    draw.ellipse((x - radius, y - radius + 4, x + radius, y + radius + 4), fill=(33, 49, 57, 70))
    overlay.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(9)))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 255, 255, 174), outline=(212, 217, 218, 224), width=2)
    frame.alpha_composite(overlay)
    return frame


def save_loop(filename, steps):
    frames = []
    durations = []
    for number, hold, tap in steps:
        original = screen(number)
        frames.append(original.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT))
        durations.append(hold)
        if tap:
            for radius, duration in ((25, 120), (35, 190)):
                cue = with_tap(original, tap, radius)
                frames.append(cue.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT))
                durations.append(duration)
    frames[0].save(
        ASSETS / filename,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        disposal=2,
        loop=0,
        optimize=True,
    )


save_loop(
    "map-to-df-restaurant-list.gif",
    [(9, 2800, (196, 234)), (10, 3200, None)],
)
save_loop(
    "restaurant-navigation-to-lighthouse.gif",
    [(12, 2800, (465, 1050)), (13, 2800, (206, 1224)), (14, 3400, None)],
)
