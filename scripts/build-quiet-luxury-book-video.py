#!/usr/bin/env python3
"""Render the Quiet Luxury Book mockups as a page-turn video.

The ten PNGs in assets/playground/quiet-luxury-book/frames are exports of
Book mockup 0 through Book mockup 9 in Figma's Latest Playground file.
Requires Pillow, NumPy, and ffmpeg (set FFMPEG_BINARY if it is not on PATH).
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets/playground/quiet-luxury-book"
FRAMES_DIR = ASSET_DIR / "frames"
OUTPUT = ASSET_DIR / "quiet-luxury-book-page-turn.mp4"

FPS = 30
HOLD_FRAMES = 45
FINAL_HOLD_FRAMES = 60
TURN_FRAMES = 36

# Page bounds in Figma's configured 1.5× export (1389 × 1227). The canvas and
# book shadows stay visible around the page during the turn.
LEFT, SPINE, RIGHT = 100, 694, 1290
TOP, BOTTOM = 226, 996
BOOK_CROP = (97, TOP, 1297, BOTTOM)
STAGE_BACKGROUND = (242, 245, 247)


def on_stage_background(image: Image.Image) -> Image.Image:
    """Keep the exported book intact while replacing its textured stage."""
    stage = Image.new("RGB", image.size, STAGE_BACKGROUND)
    shadow_mask = Image.new("L", image.size)
    ImageDraw.Draw(shadow_mask).rectangle((99, TOP + 8, 1294, BOTTOM + 6), fill=68)
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(19))
    stage.paste((90, 90, 90), mask=shadow_mask)
    stage.paste(image.crop(BOOK_CROP), BOOK_CROP[:2])
    return stage


def load_spreads() -> list[Image.Image]:
    spreads = []
    for i in range(10):
        image = on_stage_background(Image.open(FRAMES_DIR / f"{i}.png").convert("RGB"))
        pixels = np.asarray(image)
        # H.264's 4:2:0 pixel format needs even dimensions. Extend the canvas
        # by a single edge pixel rather than cropping any part of the mockup.
        pixels = np.pad(pixels, ((0, image.height % 2), (0, image.width % 2), (0, 0)), mode="edge")
        spreads.append(Image.fromarray(pixels, "RGB"))
    if len({image.size for image in spreads}) != 1:
        raise ValueError("The ten mockups must have the same dimensions")
    return spreads


def add_edge_shadow(canvas: np.ndarray, edge: float, toward_right: bool, strength: float) -> None:
    radius = 82
    lo = max(LEFT, int(edge) - (0 if toward_right else radius))
    hi = min(RIGHT, int(edge) + (radius if toward_right else 0))
    if hi <= lo:
        return
    x = np.arange(lo, hi, dtype=np.float32)
    distance = x - edge if toward_right else edge - x
    shade = 1 - strength * np.exp(-np.maximum(distance, 0) / 25)
    canvas[TOP:BOTTOM, lo:hi] = np.clip(
        canvas[TOP:BOTTOM, lo:hi] * shade[None, :, None], 0, 255
    ).astype(np.uint8)


def turning_frame(old: Image.Image, new: Image.Image, progress: float) -> Image.Image:
    eased = (1 - np.cos(np.pi * progress)) / 2
    angle = np.pi * eased
    base = np.asarray(Image.blend(old, new, eased)).copy()
    old_pixels = np.asarray(old)
    new_pixels = np.asarray(new)

    # A leaf turns from the right side of the old spread to the left side of
    # the next spread. Keep the two pages underneath visible as it moves.
    base[TOP:BOTTOM, LEFT:SPINE] = old_pixels[TOP:BOTTOM, LEFT:SPINE]
    base[TOP:BOTTOM, SPINE:RIGHT] = new_pixels[TOP:BOTTOM, SPINE:RIGHT]

    front = eased < 0.5
    page_width = RIGHT - SPINE if front else SPINE - LEFT
    u = np.arange(page_width + 1, dtype=np.float32)

    # The outer half of the paper leads the rotation slightly. Integrating
    # these local angles creates a gentle curl instead of a rigid flat panel.
    curl = 0.48 * np.sin(2 * angle)
    local_angle = angle + curl * (u / page_width - 0.5)
    x3d = np.r_[0, np.cumsum((np.cos(local_angle[:-1]) + np.cos(local_angle[1:])) / 2)]
    z3d = np.r_[0, np.cumsum((np.sin(local_angle[:-1]) + np.sin(local_angle[1:])) / 2)]
    distance = page_width * 4.3
    projected_x = SPINE + x3d * distance / (distance - z3d)
    edge = projected_x[-1]
    add_edge_shadow(base, edge, front, 0.27 * np.sin(angle))

    lo = max(0, int(np.floor(min(projected_x))))
    hi = min(old.width, int(np.ceil(max(projected_x))) + 1)
    if hi - lo < 2:
        return Image.fromarray(base, "RGB")

    x_pixels = np.arange(lo, hi, dtype=np.float32) + 0.5
    if front:
        sampled_u = np.interp(x_pixels, projected_x, u)
        source = old_pixels
        source_x = SPINE + sampled_u
    else:
        sampled_u = np.interp(x_pixels, projected_x[::-1], u[::-1])
        source = new_pixels
        source_x = SPINE - sampled_u

    depth = np.interp(sampled_u, u, z3d)
    perspective = distance / (distance - depth)
    center_y = (TOP + BOTTOM) / 2
    y_pixels = np.arange(old.height, dtype=np.float32)[:, None] + 0.5
    source_y = center_y + (y_pixels - center_y) / perspective[None, :]
    mask = (source_y >= TOP) & (source_y < BOTTOM) & (sampled_u[None, :] >= 0) & (sampled_u[None, :] <= page_width)

    # Bilinear sampling keeps the fine typography smooth as the page turns.
    sx0 = np.clip(np.floor(source_x).astype(np.int32), 0, old.width - 2)
    sx1 = sx0 + 1
    sy0 = np.clip(np.floor(source_y).astype(np.int32), 0, old.height - 2)
    sy1 = sy0 + 1
    wx = (source_x - sx0)[None, :, None]
    wy = (source_y - sy0)[:, :, None]
    sampled = (
        source[sy0, sx0[None, :]] * (1 - wx) * (1 - wy)
        + source[sy0, sx1[None, :]] * wx * (1 - wy)
        + source[sy1, sx0[None, :]] * (1 - wx) * wy
        + source[sy1, sx1[None, :]] * wx * wy
    )
    facing = np.abs(np.cos(np.interp(sampled_u, u, local_angle)))
    roll = 1 - 0.09 * np.sin(angle) * np.sin(np.pi * sampled_u / page_width)
    brightness = (0.77 + 0.23 * facing) * roll
    glint = 0.08 * np.sin(angle) * np.exp(-((sampled_u / page_width - 0.92) / 0.09) ** 2)
    sampled = np.clip(sampled * (brightness + glint)[None, :, None], 0, 255).astype(np.uint8)
    region = base[:, lo:hi]
    region[mask] = sampled[mask]

    output = Image.fromarray(base, "RGB")
    if np.sin(angle) > 0.03 and abs(edge - SPINE) > 15:
        # A fine warm paper edge gives the moving leaf visible thickness.
        edge_scale = distance / (distance - z3d[-1])
        top = int(center_y + (TOP - center_y) * edge_scale)
        bottom = int(center_y + (BOTTOM - center_y) * edge_scale)
        ImageDraw.Draw(output).line([(round(edge), top), (round(edge), bottom)], fill=(222, 219, 210), width=2)
    return output


def main() -> None:
    spreads = load_spreads()
    width, height = spreads[0].size
    rendering_output = OUTPUT.with_name("quiet-luxury-book-page-turn-rendering.mp4")
    ffmpeg = os.getenv("FFMPEG_BINARY") or shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("Set FFMPEG_BINARY to an ffmpeg executable")

    command = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{width}x{height}",
        "-r",
        str(FPS),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "17",
        "-pix_fmt",
        "yuv420p",
        "-color_range",
        "pc",
        "-movflags",
        "+faststart",
        str(rendering_output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for index, spread in enumerate(spreads):
            count = FINAL_HOLD_FRAMES if index == len(spreads) - 1 else HOLD_FRAMES
            still = spread.tobytes()
            for _ in range(count):
                process.stdin.write(still)
            if index < len(spreads) - 1:
                for step in range(1, TURN_FRAMES + 1):
                    frame = turning_frame(spread, spreads[index + 1], step / (TURN_FRAMES + 1))
                    process.stdin.write(frame.tobytes())
            print(f"Rendered Book mockup {index}", flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("ffmpeg could not finish the video")
    os.replace(rendering_output, OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
