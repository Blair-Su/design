"""Render a local-only Cube cover from vector geometry and the real demo copy.

The screen is a vector product illustration, not a browser screenshot.
Requires Pillow. Outputs a looping GIF and a reduced-motion PNG in cube-preview.
"""
from pathlib import Path
from math import cos, sin, pi
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'cube-preview/assets'
W, H, SCALE = 960, 540, 2
SCREEN_BOUNDS = (184, 86, 776, 419)  # 592 × 333, exactly 16:9.
CONTENT_BOUNDS = (96, 38, 864, 470)  # 768 × 432, scaled uniformly into the screen.
PAPER = '#FAFCFD'
INK = '#252736'
BLUE = '#5059ed'
COLORS = {'User': '#daeaff', 'Emotion': '#fbe0e9', 'Business': '#ffe6c5',
          'Tech': '#e9dfff', 'Constraint': '#e8ebf0', 'Wildcard': '#e1f2d3'}
fonts = {}


def font(size, weight=400):
    key = (size, weight)
    if key not in fonts:
        fonts[key] = ImageFont.truetype(str(ROOT / f'assets/fonts/case-inter-{weight}.ttf'), round(size * SCALE))
    return fonts[key]


class Canvas:
    def __init__(self, image=None):
        self.im = image.copy() if image is not None else Image.new('RGB', (W * SCALE, H * SCALE), PAPER)
        self.d = ImageDraw.Draw(self.im)

    def box(self, xy, fill, radius=0, outline=None, width=1):
        self.d.rounded_rectangle(tuple(round(v * SCALE) for v in xy), radius=round(radius * SCALE),
                                 fill=fill, outline=outline, width=round(width * SCALE))

    def line(self, points, color, width=1):
        self.d.line([(round(x * SCALE), round(y * SCALE)) for x, y in points], fill=color,
                    width=max(1, round(width * SCALE)), joint='curve')

    def polygon(self, points, fill):
        self.d.polygon([(round(x * SCALE), round(y * SCALE)) for x, y in points], fill=fill)

    def text(self, xy, value, size=12, weight=400, color=INK, anchor='lt'):
        self.d.text((round(xy[0] * SCALE), round(xy[1] * SCALE)), value, font=font(size, weight),
                    fill=color, anchor=anchor)

    def wrap(self, xy, value, width, size=12, weight=400, color=INK, leading=1.4):
        x, y = xy
        line = ''
        for word in value.split():
            candidate = (line + ' ' + word).strip()
            if line and self.d.textlength(candidate, font=font(size, weight)) > width * SCALE:
                self.text((x, y), line, size, weight, color)
                y += size * leading
                line = word
            else:
                line = candidate
        if line:
            self.text((x, y), line, size, weight, color)

    def cube(self, cx, cy, size, angle=0):
        """Orthographic version of the existing three-face Cube app logo."""
        def rotate(v):
            x, y, z = v
            return (x * cos(angle) + z * sin(angle), y, -x * sin(angle) + z * cos(angle))

        def project(v):
            x, y, z = rotate(v)
            return (cx + (x - z) * .866 * size, cy + ((x + z) * .5 - y) * size)

        faces = [
            ((0, 1, 0), [(-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)]),
            ((1, 0, 0), [(1, -1, -1), (1, -1, 1), (1, 1, 1), (1, 1, -1)]),
            ((-1, 0, 0), [(-1, -1, 1), (-1, -1, -1), (-1, 1, -1), (-1, 1, 1)]),
            ((0, 0, 1), [(1, -1, 1), (-1, -1, 1), (-1, 1, 1), (1, 1, 1)]),
            ((0, 0, -1), [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)]),
        ]
        for normal, vertices in faces:
            nx, ny, nz = rotate(normal)
            if nx + ny + nz <= .00001:
                continue
            if ny:
                color = '#b4bdff'
            else:
                light = max(0, min(1, nz))
                color = tuple(round(a + (b - a) * light) for a, b in zip((77, 87, 230), (112, 138, 255)))
            pts = [project(v) for v in vertices]
            self.polygon(pts, color)
            self.line(pts + [pts[0]], '#eef0ff', .55)


def monitor():
    c = Canvas()
    # Match the supplied reference: 16:9 screen, equal 14px bezels, a deeper
    # silver chin, and a straight stand continuing beyond the bottom edge.
    # All screen content scales uniformly; only the illustration is composed here.
    for y in range(493, H):
        shade = round(162 + (y - 493) / (H - 493) * 32)
        c.box((406, y, 554, y + 1), (shade, shade, shade))
    c.box((170, 72, 790, 496), '#edeef0', 11)
    c.box((183, 85, 777, 420), '#ffffff', 0, '#acafb3', .6)
    c.box(SCREEN_BOUNDS, '#f8f9fd')
    c.box((170, 433, 790, 496), '#d5d6d7', 11)
    c.box((170, 433, 790, 479), '#d5d6d7')
    c.box((477.8, 76, 482.2, 80.4), '#5c5e63', 2.2)
    return c


def mount_screen(content):
    c = monitor()
    screen = content.im.crop(tuple(v * SCALE for v in CONTENT_BOUNDS))
    x, y, right, bottom = SCREEN_BOUNDS
    screen = screen.resize(((right - x) * SCALE, (bottom - y) * SCALE), Image.Resampling.LANCZOS)
    c.im.paste(screen, (x * SCALE, y * SCALE))
    return c.im


def toolbar(c):
    c.box((97, 39, 863, 73), '#ffffff')
    c.line([(97, 73), (863, 73)], '#e9ebf0', .6)
    for y in (52, 56, 60):
        c.line([(106, y), (114, y)], '#606777', .8)
    c.cube(134, 56, 4.4)
    c.text((148, 48), 'Cube.ai', 17, 600)
    c.text((480, 56), 'Onboarding exploration', 11, 500, '#454b5c', 'mm')
    c.box((761, 46, 804, 66), '#ffffff', 4, '#e4e7ec', .6)
    c.text((782, 56), 'Share', 9, 400, anchor='mm')
    c.box((811, 46, 854, 66), BLUE, 4)
    c.text((832, 56), 'Export', 9, 500, '#ffffff', 'mm')


def demo_screen():
    c = Canvas()
    c.box(CONTENT_BOUNDS, '#f8f9fd')
    toolbar(c)
    for x in range(125, 680, 15):
        for y in range(96, 468, 15):
            c.box((x, y, x + .6, y + .6), '#dfe4ef')
    # Canvas controls and the real demo's three question groups / eight notes.
    c.box((105, 88, 125, 168), '#ffffff', 4, '#e8eaf0', .5)
    for y in (101, 122, 151):
        c.line([(111, y), (118, y)], '#778090', 1)
    c.box((137, 82, 188, 101), '#ffffff', 4, '#e4e7ef', .6)
    c.text((162, 91), 'Tidy up', 9, 400, '#596072', 'mm')
    c.box((195, 82, 263, 101), '#ffffff', 4, '#e4e7ef', .6)
    c.text((229, 91), '2×2 Map  →', 9, 400, '#596072', 'mm')
    groups = [
        ('How might we make the first step feel effortless?', [
            ('User', 'One real task instead of a long product tour.'),
            ('Tech', 'A ready-to-edit project, tailored to their role.'),
            ('Constraint', 'One core action. A first win in 60 seconds.')]),
        ('How might we create a little moment of delight?', [
            ('Emotion', 'A small celebration for that very first win.'),
            ('User', 'A head start instead of a blank canvas.'),
            ('Business', 'Let people feel the value before signing up.')]),
        ('How might we give people a reason to return?', [
            ('Business', 'Save a next step before they leave.'),
            ('Emotion', 'Show personal progress, not the pressure of a streak.')]),
    ]
    for i, (question, notes) in enumerate(groups):
        x = 140 + i * 173
        c.box((x - 5, 112, x + 156, 354), '#f3f5fb', 5, '#e5e9f2', .5)
        c.wrap((x + 3, 122), question, 143, 10, 500, '#434b60', 1.35)
        for j, (face, idea) in enumerate(notes):
            y = 164 + j * 61
            c.box((x + 2, y, x + 148, y + 54), COLORS[face], 3)
            c.wrap((x + 11, y + 9), idea, 128, 10.2, 400, '#394357', 1.35)
    # Companion matches the current manual workflow, with no invented AI output.
    c.box((680, 74, 864, 470), '#ffffff')
    c.line([(680, 74), (680, 470)], '#e1e5ee', .6)
    c.cube(702, 91, 4.5)
    c.text((717, 83), 'Cube', 12, 600)
    c.text((717, 98), 'Your thinking companion', 8, 400, '#8a92a5')
    c.line([(680, 116), (864, 116)], '#e8ebf1', .6)
    c.text((694, 132), 'Six sides.', 20, 600, '#343c52')
    c.text((694, 156), 'Room for your ideas.', 16, 500, '#343c52')
    c.wrap((694, 188), 'Choose a perspective, then add your own thoughts to the board.', 150, 10, 400, '#868ea2')
    c.text((694, 237), 'PERSPECTIVES', 8, 500, '#969daf')
    for i, (name, color) in enumerate(COLORS.items()):
        y = 255 + i * 19
        c.box((694, y, 705, y + 11), color, 3)
        c.text((713, y + 1), name, 10, 400, '#677188')
    c.box((691, 438, 854, 460), '#f6f7fb', 5, '#eaedf3', .5)
    c.text((701, 446), 'Cube AI is not connected', 9, 400, '#a0a6b4')
    # Small colored sticky-note toolbar, as in the prototype.
    c.box((279, 435, 553, 461), '#ffffff', 6, '#dfe4ef', .6)
    c.line([(292, 443), (292, 453), (299, 449), (292, 443)], '#616a7d', 1)
    for i, color in enumerate(COLORS.values()):
        c.box((326 + i * 24, 442, 342 + i * 24, 455), color, 2)
    c.text((516, 448), '+', 16, 400, '#6e7890', 'mm')
    return mount_screen(c)


def splash(angle=0):
    c = Canvas()
    c.box(CONTENT_BOUNDS, '#f8f9fd')
    # Large, legible lockup first; only the icon turns, the name stays still.
    cx, cy = 334, 254
    c.cube(cx, cy, 25, angle)
    c.text((398, 253), 'Cube.ai', 64, 600, '#252736', 'lm')
    return mount_screen(c)


OUT.mkdir(exist_ok=True)
demo = demo_screen()
frames, durations = [], []
def add(im, duration):
    frames.append(im.resize((W, H), Image.Resampling.LANCZOS))
    durations.append(duration)

add(splash(), 800)
for i in range(1, 19):
    t = i / 18
    add(splash((t * t * (3 - 2 * t)) * pi / 2), 55)
logo = splash(pi / 2)
for i in range(1, 7):
    add(Image.blend(logo, demo, i / 6), 65)
durations[-1] = 2600
for i in range(1, 7):
    add(Image.blend(demo, splash(), i / 6), 65)

# A shared palette keeps fine type stable through the dissolves.
palette_source = Image.new('RGB', (W, H * 3))
for i, frame in enumerate([frames[0], frames[21], frames[24]]):
    palette_source.paste(frame, (0, i * H))
palette = palette_source.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(OUT / 'cube-monitor.gif', save_all=True, append_images=indexed[1:],
                duration=durations, loop=0, disposal=1, optimize=True)
demo.resize((W, H), Image.Resampling.LANCZOS).save(OUT / 'cube-monitor-poster.png', optimize=True)
demo.save(OUT / 'cube-monitor-poster-1920.png', optimize=True)
frames[0].save(OUT / 'cube-monitor-logo.png', optimize=True)
print(f'Created {len(frames)} frames, {sum(durations) / 1000:.2f}s loop.')
for name in ['cube-monitor.gif', 'cube-monitor-poster.png', 'cube-monitor-poster-1920.png']:
    print(name, (OUT / name).stat().st_size, 'bytes')
