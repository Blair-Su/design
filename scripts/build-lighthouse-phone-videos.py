"""Transcode the four existing GIF demos for pause/resume without changing their timing."""

import argparse
from pathlib import Path
import subprocess

from PIL import Image


parser = argparse.ArgumentParser()
parser.add_argument("--ffmpeg", default="ffmpeg")
args = parser.parse_args()
assets = Path(__file__).resolve().parents[1] / "assets/case-studies/lighthouse-storyboard"
names = (
    "onboarding-4-to-8",
    "map-to-df-restaurant-list",
    "restaurant-navigation-to-lighthouse",
    "post-meal-lock-screen",
)

for name in names:
    durations = []
    with Image.open(assets / f"{name}.gif") as gif:
        for frame in range(gif.n_frames):
            gif.seek(frame)
            durations.append(gif.info["duration"] / 1000)
    duration = sum(durations)
    output = assets / f"{name}.mp4"
    # Pad before trimming so the GIF's final still keeps its complete hold time.
    subprocess.run([
        args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-ignore_loop", "1", "-i", str(assets / f"{name}.gif"),
        "-vf", f"fps=30,tpad=stop_mode=clone:stop_duration={durations[-1]}",
        "-t", str(duration), "-an", "-c:v", "libx264", "-crf", "16",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ], check=True)
    subprocess.run([
        args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(output), "-frames:v", "1", "-c:v", "libwebp",
        "-quality", "95", str(assets / f"{name}-poster.webp"),
    ], check=True)
    print(f"{name}: {duration:.2f}s")
