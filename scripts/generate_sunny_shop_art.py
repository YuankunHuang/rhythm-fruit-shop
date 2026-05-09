#!/usr/bin/env python3
"""Generate the bright high-polish Sunny Fruit Fair theme art pack."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "game_art" / "sunny_shop"


COLORS = {
    "ink": (55, 70, 54, 255),
    "green": (78, 183, 72, 255),
    "deep_green": (36, 137, 67, 255),
    "lime": (170, 226, 61, 255),
    "cream": (255, 246, 212, 255),
    "orange": (255, 166, 42, 255),
    "yellow": (255, 220, 82, 255),
    "pink": (255, 104, 128, 255),
    "blue": (61, 171, 240, 255),
    "purple": (139, 112, 231, 255),
}


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name)


def glow(size: tuple[int, int], draw_fn, blur: int = 18) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def outlined_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size: int, fill, stroke=(255, 255, 255, 255), width: int = 6) -> None:
    draw.text(xy, text, font=font(size), fill=fill, stroke_width=width, stroke_fill=stroke)


def paste_shadow(base: Image.Image, img: Image.Image, xy: tuple[int, int], blur: int = 10, alpha: int = 105) -> None:
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    mask = img.split()[-1]
    solid = Image.new("RGBA", img.size, (0, 0, 0, alpha))
    shadow.paste(solid, xy, mask)
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))
    base.alpha_composite(img, xy)


def make_fruit(name: str, color: tuple[int, int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    img.alpha_composite(glow((256, 256), lambda d: d.ellipse((38, 42, 218, 220), fill=color[:3] + (128,)), 16))
    d = ImageDraw.Draw(img)
    d.ellipse((48, 42, 208, 210), fill=color, outline=(255, 255, 255, 255), width=10)
    d.ellipse((70, 58, 142, 118), fill=(255, 255, 255, 84))
    d.ellipse((84, 76, 116, 104), fill=(255, 255, 255, 118))
    if name in {"apple", "lime", "berry"}:
        d.ellipse((128, 28, 180, 58), fill=(98, 204, 76, 255), outline=(255, 255, 255, 230), width=5)
        d.line((140, 50, 170, 38), fill=(45, 130, 61, 160), width=3)
    if name in {"orange", "lime"}:
        for a in range(0, 360, 45):
            d.line((128, 128, 128 + math.cos(math.radians(a)) * 62, 128 + math.sin(math.radians(a)) * 62), fill=(255, 255, 255, 92), width=5)
        d.ellipse((112, 112, 144, 144), outline=(255, 255, 255, 115), width=4)
    if name == "grape":
        d.rectangle((48, 42, 208, 210), fill=(0, 0, 0, 0))
        for i, (x, y) in enumerate([(94, 78), (142, 78), (118, 116), (78, 136), (158, 136), (118, 170)]):
            grape = COLORS["purple"] if i % 2 else (172, 127, 244, 255)
            d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=grape, outline=(255, 255, 255, 225), width=6)
        d.ellipse((126, 32, 178, 62), fill=(98, 204, 76, 255), outline=(255, 255, 255, 210), width=4)
    if name == "banana":
        d.rectangle((0, 0, 256, 256), fill=(0, 0, 0, 0))
        img.alpha_composite(glow((256, 256), lambda g: g.arc((30, 34, 226, 228), 36, 220, fill=(255, 220, 82, 150), width=54), 14))
        d.arc((30, 34, 226, 228), 36, 220, fill=COLORS["yellow"], width=56)
        d.arc((52, 60, 206, 208), 42, 208, fill=(255, 255, 255, 140), width=10)
        d.ellipse((62, 68, 94, 100), fill=(255, 247, 160, 210))
    return img


def make_fruits() -> None:
    specs = {
        "apple": COLORS["pink"],
        "orange": COLORS["orange"],
        "lime": COLORS["lime"],
        "banana": COLORS["yellow"],
        "grape": COLORS["purple"],
        "berry": COLORS["blue"],
    }
    for name, color in specs.items():
        save(make_fruit(name, color), f"fruit_{name}.png")


def make_logo() -> None:
    img = Image.new("RGBA", (820, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    img.alpha_composite(glow((820, 300), lambda g: g.rounded_rectangle((138, 56, 682, 228), radius=46, fill=(255, 206, 66, 132)), 18))

    title_font = font(76)
    prefix = "节奏鲜果"
    suffix = "铺"
    prefix_box = d.textbbox((0, 0), prefix, font=title_font, stroke_width=8)
    suffix_box = d.textbbox((0, 0), suffix, font=title_font, stroke_width=8)
    prefix_w = prefix_box[2] - prefix_box[0]
    suffix_w = suffix_box[2] - suffix_box[0]
    gap = -6
    title_x = (820 - prefix_w - suffix_w - gap) // 2
    title_y = 82
    d.text((title_x, title_y), prefix, font=title_font, fill=COLORS["green"], stroke_width=8, stroke_fill=(255, 255, 255, 255))
    d.text((title_x + prefix_w + gap, title_y), suffix, font=title_font, fill=COLORS["orange"], stroke_width=8, stroke_fill=(255, 255, 255, 255))

    slogan = "跟着节奏，制作暖心鲜果杯！"
    slogan_font = font(22)
    slogan_box = d.textbbox((0, 0), slogan, font=slogan_font)
    badge_w = (slogan_box[2] - slogan_box[0]) + 64
    badge_x = (820 - badge_w) // 2
    d.rounded_rectangle((badge_x, 206, badge_x + badge_w, 258), radius=24, fill=(69, 178, 89, 255), outline=(255, 255, 255, 255), width=5)
    d.text((badge_x + 32, 217), slogan, font=slogan_font, fill=(255, 255, 255, 255))
    for fruit, pos, size in [
        ("orange", (128, 152), 58),
        ("lime", (318, 56), 46),
        ("apple", (456, 56), 48),
        ("berry", (636, 152), 52),
    ]:
        icon = Image.open(OUT / f"fruit_{fruit}.png").resize((size, size), Image.Resampling.LANCZOS)
        paste_shadow(img, icon, pos, 6, 80)
    save(img, "brand_logo.png")


def make_background() -> None:
    img = Image.new("RGBA", (1280, 720), (255, 244, 196, 255))
    d = ImageDraw.Draw(img)
    for y in range(720):
        t = y / 719
        d.line((0, y, 1280, y), fill=(255, int(232 + 18 * (1 - t)), int(176 + 54 * t), 255))
    img.alpha_composite(glow((1280, 720), lambda g: (g.ellipse((-120, -100, 370, 260), fill=(255, 210, 65, 110)), g.ellipse((800, -90, 1320, 330), fill=(123, 221, 90, 105))), 42))
    for x in range(0, 1280, 120):
        d.polygon([(x, 72), (x + 42, 72), (x + 21, 112)], fill=(255, 126, 126, 170))
        d.polygon([(x + 45, 72), (x + 87, 72), (x + 66, 112)], fill=(255, 216, 85, 170))
        d.line((x, 72, x + 120, 72), fill=(255, 255, 255, 145), width=3)
    for x, y, r, c in [(90, 565, 110, COLORS["orange"]), (1120, 585, 130, COLORS["lime"]), (1040, 135, 48, COLORS["pink"]), (210, 120, 44, COLORS["blue"])]:
        d.ellipse((x - r, y - r, x + r, y + r), fill=c[:3] + (78,), outline=(255, 255, 255, 120), width=5)
    d.rounded_rectangle((70, 150, 250, 620), radius=26, fill=(255, 255, 255, 70), outline=(255, 255, 255, 90), width=3)
    d.rounded_rectangle((1020, 126, 1215, 628), radius=28, fill=(255, 255, 255, 72), outline=(255, 255, 255, 105), width=3)
    save(img, "background_sunny.png")


def draw_lane_scene(img: Image.Image, thumb: bool = False) -> None:
    d = ImageDraw.Draw(img)
    w, h = img.size
    lane = [(w * 0.34, h * 0.92), (w * 0.66, h * 0.92), (w * 0.58, h * 0.18), (w * 0.42, h * 0.18)]
    img.alpha_composite(glow(img.size, lambda g: g.polygon(lane, fill=(82, 219, 92, 130)), 18))
    d.polygon(lane, fill=(34, 162, 95, 228), outline=(236, 255, 164, 235))
    for k in [0.25, 0.5, 0.75]:
        x1 = w * (0.34 + 0.32 * k)
        x2 = w * (0.42 + 0.16 * k)
        d.line((x1, h * 0.92, x2, h * 0.18), fill=(219, 255, 203, 150), width=3)
    d.line((w * 0.30, h * 0.84, w * 0.70, h * 0.84), fill=(244, 255, 160, 255), width=8)
    for x in [w * 0.36, w * 0.50, w * 0.64]:
        img.alpha_composite(glow(img.size, lambda g, x=x: g.ellipse((x - 45, h * 0.82 - 18, x + 45, h * 0.82 + 42), fill=(232, 255, 128, 150)), 14))
        d.ellipse((x - 36, h * 0.82 - 10, x + 36, h * 0.82 + 30), fill=(255, 255, 246, 220), outline=(212, 245, 95, 255), width=5)
    fruits = [("apple", .49, .23), ("lime", .56, .35), ("orange", .48, .48), ("berry", .57, .61), ("banana", .47, .74)]
    for name, fx, fy in fruits:
        size = 58 if thumb else 72
        icon = Image.open(OUT / f"fruit_{name}.png").resize((size, size), Image.Resampling.LANCZOS)
        paste_shadow(img, icon, (int(w * fx - size / 2), int(h * fy - size / 2)), 8, 100)


def make_shop_card() -> None:
    img = Image.new("RGBA", (420, 300), (0, 0, 0, 0))
    img.alpha_composite(glow((420, 300), lambda g: g.rounded_rectangle((24, 22, 396, 276), radius=34, fill=(255, 184, 46, 120)), 16))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((28, 24, 392, 270), radius=34, fill=(255, 252, 226, 248), outline=(255, 255, 255, 255), width=5)
    d.rounded_rectangle((74, 44, 346, 88), radius=22, fill=COLORS["green"], outline=(255, 255, 255, 255), width=4)
    d.text((113, 52), "订单进行中", font=font(26), fill=(255, 255, 255, 255))
    d.rounded_rectangle((62, 112, 182, 248), radius=18, fill=(255, 255, 255, 245), outline=(235, 215, 155, 255), width=3)
    for i, name in enumerate(["apple", "orange", "lime", "banana"]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((42, 42), Image.Resampling.LANCZOS)
        img.alpha_composite(icon, (218, 114 + i * 34))
        d.text((270, 122 + i * 34), f"{8 - i}/10", font=font(19), fill=COLORS["ink"] if i != 2 else COLORS["green"])
    for i, name in enumerate(["apple", "orange", "lime", "banana"]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((42, 42), Image.Resampling.LANCZOS)
        img.alpha_composite(icon, (82 + (i % 2) * 42, 132 + (i // 2) * 42))
    save(img, "shop_card.png")


def make_customer() -> None:
    img = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    img.alpha_composite(glow((180, 180), lambda g: g.ellipse((24, 22, 156, 160), fill=(255, 216, 80, 130)), 14))
    d = ImageDraw.Draw(img)
    d.ellipse((34, 28, 146, 146), fill=(255, 215, 140, 255), outline=(255, 255, 255, 255), width=7)
    d.pieslice((26, 14, 154, 98), 180, 360, fill=(119, 79, 42, 255))
    d.ellipse((58, 78, 70, 90), fill=COLORS["ink"])
    d.ellipse((108, 78, 120, 90), fill=COLORS["ink"])
    d.arc((66, 88, 116, 126), 20, 160, fill=(221, 82, 94, 255), width=6)
    d.rounded_rectangle((42, 124, 138, 168), radius=22, fill=(92, 200, 122, 255))
    d.text((138, 44), "★", font=font(26), fill=COLORS["yellow"])
    save(img, "customer_happy.png")


def make_icons() -> None:
    for name, color, glyph in [
        ("icon_music", COLORS["pink"], "♪"),
        ("icon_order", COLORS["green"], "杯"),
        ("icon_star", COLORS["yellow"], "★"),
        ("icon_shop", COLORS["purple"], "店"),
        ("icon_heart", COLORS["pink"], "♥"),
        ("icon_pause", (255, 255, 255, 255), "Ⅱ"),
    ]:
        img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        img.alpha_composite(glow((128, 128), lambda d: d.ellipse((16, 16, 112, 112), fill=color[:3] + (120,)), 9))
        d = ImageDraw.Draw(img)
        d.ellipse((18, 16, 110, 108), fill=color, outline=(255, 255, 255, 255), width=6)
        fill = COLORS["ink"] if name == "icon_pause" else (255, 255, 255, 255)
        bbox = d.textbbox((0, 0), glyph, font=font(42))
        d.text(((128 - (bbox[2] - bbox[0])) / 2, 35), glyph, font=font(42), fill=fill)
        save(img, f"{name}.png")


def make_poster() -> None:
    img = Image.new("RGBA", (960, 540), (255, 240, 183, 255))
    d = ImageDraw.Draw(img)
    for y in range(540):
        t = y / 539
        d.line((0, y, 960, y), fill=(255, int(232 + 12 * (1 - t)), int(176 + 40 * t), 255))
    img.alpha_composite(glow((960, 540), lambda g: (g.ellipse((-90, -50, 260, 190), fill=(255, 202, 50, 120)), g.ellipse((720, -80, 1040, 210), fill=(135, 224, 80, 110))), 32))
    for x in range(0, 960, 90):
        d.polygon([(x, 48), (x + 34, 48), (x + 17, 82)], fill=(255, 122, 122, 180))
        d.polygon([(x + 36, 48), (x + 70, 48), (x + 53, 82)], fill=(255, 219, 84, 180))
    outlined_text(d, (62, 64), "节奏鲜果", 72, COLORS["green"], width=7)
    outlined_text(d, (150, 140), "铺", 78, COLORS["orange"], width=7)
    d.rounded_rectangle((104, 238, 274, 376), radius=24, fill=(255, 255, 238, 230), outline=(255, 255, 255, 255), width=4)
    d.text((132, 258), "得分", font=font(18), fill=COLORS["green"])
    d.text((128, 288), "128,560", font=font(35), fill=COLORS["deep_green"])
    d.text((132, 338), "256 COMBO", font=font(24), fill=COLORS["pink"])
    draw_lane_scene(img, thumb=True)
    d.rounded_rectangle((700, 70, 892, 374), radius=28, fill=(255, 255, 238, 238), outline=(255, 255, 255, 255), width=5)
    d.rounded_rectangle((728, 88, 864, 128), radius=20, fill=COLORS["green"], outline=(255, 255, 255, 255), width=3)
    d.text((746, 96), "订单进行中", font=font(19), fill=(255, 255, 255, 255))
    cup = Image.open(OUT / "shop_card.png").resize((150, 108), Image.Resampling.LANCZOS)
    img.alpha_composite(cup, (722, 148))
    for i, (name, txt) in enumerate([("apple", "8/10"), ("orange", "6/8"), ("lime", "6/6 ✓"), ("banana", "4/6")]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((32, 32), Image.Resampling.LANCZOS)
        img.alpha_composite(icon, (740, 270 + i * 28))
        d.text((784, 274 + i * 28), txt, font=font(17), fill=COLORS["green"] if "✓" in txt else COLORS["ink"])
    for fruit, pos, size in [("orange", (16, 382), 86), ("lime", (118, 408), 62), ("banana", (790, 395), 72), ("berry", (70, 442), 36)]:
        icon = Image.open(OUT / f"fruit_{fruit}.png").resize((size, size), Image.Resampling.LANCZOS)
        paste_shadow(img, icon, pos, 7, 90)
    d.rounded_rectangle((126, 462, 835, 526), radius=22, fill=(255, 250, 224, 240), outline=(255, 255, 255, 255), width=4)
    for i, (label, icon) in enumerate([("动感节奏", "icon_music"), ("爽快连击", "icon_star"), ("完成订单", "icon_order"), ("装扮小铺", "icon_shop")]):
        x = 156 + i * 170
        art = Image.open(OUT / f"{icon}.png").resize((42, 42), Image.Resampling.LANCZOS)
        img.alpha_composite(art, (x, 473))
        d.text((x + 50, 474), label, font=font(20), fill=[COLORS["pink"], COLORS["orange"], COLORS["green"], COLORS["purple"]][i])
        d.text((x + 50, 500), ["跟随节拍", "连击越高", "满足顾客", "升级店铺"][i], font=font(12, False), fill=COLORS["ink"][:3] + (185,))
    save(img, "theme_thumb_sunny.png")


def main() -> None:
    make_fruits()
    make_logo()
    make_background()
    make_shop_card()
    make_customer()
    make_icons()
    make_poster()
    print(f"Generated sunny shop assets in {OUT}")


if __name__ == "__main__":
    main()
