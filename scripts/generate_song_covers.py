from __future__ import annotations

import json
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "songs"


PALETTES = {
    "day": {
        "sky": ((232, 255, 240), (255, 247, 220)),
        "accent": (84, 205, 143),
        "secondary": (255, 177, 76),
        "ink": (39, 48, 68),
    },
    "dusk": {
        "sky": ((255, 218, 161), (255, 120, 144)),
        "accent": (255, 177, 76),
        "secondary": (139, 94, 255),
        "ink": (58, 35, 62),
    },
    "night": {
        "sky": ((10, 15, 43), (52, 18, 71)),
        "accent": (121, 255, 245),
        "secondary": (255, 75, 181),
        "ink": (245, 248, 255),
    },
    "late": {
        "sky": ((5, 8, 24), (44, 19, 89)),
        "accent": (245, 80, 181),
        "secondary": (255, 223, 92),
        "ink": (245, 248, 255),
    },
}
FRUITS = [
    (255, 112, 135),
    (255, 190, 88),
    (126, 223, 118),
    (150, 111, 255),
    (255, 226, 92),
    (112, 218, 255),
]


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line((0, y, w, y), fill=tuple(lerp(top[i], bottom[i], t) for i in range(3)))
    return img


def load_songs() -> list[dict]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r"const SONGS=(\[.*?\]);\s*const DIFFS=", html, re.S)
    if not match:
        raise RuntimeError("Cannot find SONGS in index.html")
    return json.loads(match.group(1))


def seeded_rng(song: dict) -> random.Random:
    seed = sum((i + 1) * ord(c) for i, c in enumerate(song["id"]))
    return random.Random(seed)


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(lerp(a[i], b[i], t) for i in range(3))


def add_glow(base: Image.Image, center: tuple[int, int], color: tuple[int, int, int], radius: int, alpha: int) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow, "RGBA")
    x, y = center
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color + (alpha,))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(radius // 2)))


def draw_fruit(draw: ImageDraw.ImageDraw, x: int, y: int, r: int, fill: tuple[int, int, int], tilt: float) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill + (245,))
    leaf_x = x + int(math.cos(tilt) * r * 0.28)
    leaf_y = y - r - 8
    draw.ellipse((leaf_x - r // 3, leaf_y - r // 5, leaf_x + r // 2, leaf_y + r // 4), fill=(78, 205, 112, 235))
    draw.arc((x - r // 2, y - r // 2, x + r // 2, y + r // 2), 210, 320, fill=(255, 255, 255, 140), width=max(3, r // 9))


def draw_shop_scene(img: Image.Image, song: dict, *, snapshot: bool) -> Image.Image:
    rng = seeded_rng(song)
    palette = PALETTES.get(song.get("stage", "day"), PALETTES["day"])
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    accent = palette["accent"]
    secondary = palette["secondary"]

    for _ in range(8):
        add_glow(
            img,
            (rng.randint(100, w - 100), rng.randint(60, h - 80)),
            rng.choice([accent, secondary, (255, 255, 255)]),
            rng.randint(80, 190),
            rng.randint(18, 42),
        )

    horizon = int(h * (0.58 + rng.random() * 0.06))
    draw.polygon([(0, h), (0, horizon), (w, horizon - 60), (w, h)], fill=(255, 255, 255, 34))
    for i in range(7):
        bx = i * 210 - rng.randint(20, 80)
        bw = rng.randint(120, 230)
        bh = rng.randint(150, 330)
        top = horizon - bh + rng.randint(-20, 30)
        building = blend(accent, (8, 12, 30), 0.65 if song.get("stage") in {"night", "late"} else 0.35)
        draw.rounded_rectangle((bx, top, bx + bw, horizon + 80), radius=18, fill=building + (80,))
        for row in range(3, 12):
            for col in range(1, max(2, bw // 44)):
                if rng.random() < 0.42:
                    wx, wy = bx + col * 38, top + row * 25
                    draw.rounded_rectangle((wx, wy, wx + 16, wy + 7), radius=3, fill=secondary + (115,))

    lane_y = int(h * 0.58)
    for i in range(5):
        x = 90 + i * 250 + rng.randint(-30, 30)
        draw.line((x, 40, x + rng.randint(-80, 80), h - 90), fill=accent + (54,), width=14)
    draw.rounded_rectangle((70, lane_y, w - 70, lane_y + 112), radius=56, fill=(255, 255, 255, 48))
    draw.line((100, lane_y + 56, w - 100, lane_y + 56), fill=secondary + (180,), width=7)

    for i in range(11):
        fx = 140 + i * 100 + rng.randint(-22, 22)
        fy = lane_y + rng.randint(-62, 36)
        radius = rng.randint(28, 52)
        color = FRUITS[(i + rng.randint(0, len(FRUITS) - 1)) % len(FRUITS)]
        draw_fruit(draw, fx, fy, radius, color, rng.random() * math.tau)

    stall_x, stall_y = int(w * 0.58), int(h * 0.18)
    draw.rounded_rectangle((stall_x, stall_y, stall_x + 390, stall_y + 260), radius=44, fill=(255, 255, 255, 64), outline=accent + (140,), width=4)
    draw.rounded_rectangle((stall_x + 34, stall_y + 150, stall_x + 356, stall_y + 214), radius=28, fill=secondary + (96,))
    for i in range(5):
        draw_fruit(draw, stall_x + 68 + i * 58, stall_y + 126 + rng.randint(-8, 8), 24, FRUITS[i], i)

    if snapshot:
        # Snapshot images are a little darker and more atmospheric for future in-game backgrounds.
        veil = Image.new("RGBA", img.size, (4, 8, 20, 58))
        img.alpha_composite(veil)
    return img


def make_art(song: dict, *, snapshot: bool = False) -> Image.Image:
    w, h = 1280, 720
    palette = PALETTES.get(song.get("stage", "day"), PALETTES["day"])
    top, bottom = palette["sky"]
    img = gradient((w, h), top, bottom).convert("RGBA")
    img = draw_shop_scene(img, song, snapshot=snapshot)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=115, threshold=3))
    return img.convert("RGB")


def main() -> None:
    songs = load_songs()
    for song in songs:
        folder = OUT / song["id"]
        folder.mkdir(parents=True, exist_ok=True)
        make_art(song).save(folder / "cover.png", optimize=True)
        make_art(song, snapshot=True).save(folder / "snapshot.png", optimize=True)
    print(f"Generated {len(songs)} song cover/snapshot pairs in {OUT}")


if __name__ == "__main__":
    main()
