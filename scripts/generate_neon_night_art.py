#!/usr/bin/env python3
"""Generate the neon night PNG art pack used by the demo."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "game_art" / "neon_night"
DAY = ROOT / "assets" / "game_art" / "clean_mobile"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
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


def glow_layer(size: tuple[int, int], draw_fn, blur: int = 18) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def neon_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size: int, fill: tuple[int, int, int, int]) -> None:
    f = font(size)
    x, y = xy
    for offset, alpha in [(5, 45), (3, 70), (1, 110)]:
        for dx, dy in [(-offset, 0), (offset, 0), (0, -offset), (0, offset), (-offset, -offset), (offset, offset)]:
            draw.text((x + dx, y + dy), text, font=f, fill=fill[:3] + (alpha,))
    draw.text((x, y), text, font=f, fill=fill)


def make_background() -> None:
    img = Image.new("RGBA", (1280, 720), (5, 8, 23, 255))
    d = ImageDraw.Draw(img)
    for y in range(720):
        t = y / 719
        color = (int(6 + 14 * t), int(8 + 10 * t), int(24 + 30 * t), 255)
        d.line((0, y, 1280, y), fill=color)
    img.alpha_composite(glow_layer((1280, 720), lambda g: (g.ellipse((60, -80, 430, 260), fill=(0, 240, 255, 115)), g.ellipse((790, 20, 1260, 360), fill=(255, 35, 170, 95))), 42))
    for i in range(18):
        x = 40 + i * 72
        h = 160 + (i % 5) * 44
        d.rectangle((x, 720 - h, x + 46, 720), fill=(10, 14, 35, 205))
        for j in range(5):
            wx = x + 8 + (j % 2) * 18
            wy = 720 - h + 18 + j * 28
            d.rectangle((wx, wy, wx + 8, wy + 12), fill=(255, 217, 120, 70 + (i + j) % 2 * 55))
    for i in range(16):
        x = i * 86
        d.line((x, 120, x + 70, 122), fill=(255, 80, 180, 90), width=2)
        d.ellipse((x + 66, 116, x + 76, 126), fill=(255, 217, 120, 170))
    save(img, "background_neon.png")


def make_logo() -> None:
    img = Image.new("RGBA", (760, 280), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    def centered(text: str, y: int, size: int, color: tuple[int, int, int, int]) -> None:
        f = font(size)
        box = d.textbbox((0, 0), text, font=f)
        neon_text(d, ((760 - (box[2] - box[0])) // 2, y), text, size, color)

    img.alpha_composite(glow_layer((760, 280), lambda g: g.rounded_rectangle((122, 24, 638, 236), radius=42, fill=(121, 255, 245, 58)), 20))
    centered("Neon", 20, 82, (121, 255, 245, 255))
    centered("Night", 92, 82, (255, 75, 181, 255))
    centered("MARKET", 176, 50, (255, 223, 92, 255))
    d.rounded_rectangle((226, 232, 534, 266), radius=17, outline=(76, 255, 240, 220), width=3)
    d.text((252, 238), "RHYTHM • FRUIT • JUICE", font=font(18), fill=(121, 255, 245, 255))
    save(img, "brand_logo.png")


def make_fruit_orbs() -> None:
    specs = {
        "apple": (255, 47, 142),
        "orange": (255, 154, 30),
        "lime": (100, 255, 75),
        "banana": (255, 232, 70),
        "grape": (168, 75, 255),
        "berry": (65, 180, 255),
    }
    for name, color in specs.items():
        img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        img.alpha_composite(glow_layer((256, 256), lambda g, c=color: g.ellipse((42, 42, 214, 214), fill=c + (170,)), 22))
        d = ImageDraw.Draw(img)
        d.ellipse((54, 50, 202, 206), fill=color + (235,), outline=(255, 255, 255, 235), width=8)
        d.ellipse((78, 68, 132, 116), fill=(255, 255, 255, 95))
        if name in {"orange", "lime"}:
            for a in range(0, 360, 45):
                d.line((128, 128, 128 + math.cos(math.radians(a)) * 58, 128 + math.sin(math.radians(a)) * 58), fill=(255, 255, 255, 88), width=5)
        if name == "grape":
            for x, y in [(95, 98), (138, 98), (116, 130), (92, 154), (142, 154)]:
                d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(195, 120, 255, 230), outline=(255, 255, 255, 120), width=4)
        if name in {"apple", "lime", "berry"}:
            d.ellipse((130, 34, 180, 62), fill=(111, 255, 124, 240), outline=(255, 255, 255, 180), width=4)
        save(img, f"fruit_{name}.png")


def make_cards() -> None:
    shop = Image.new("RGBA", (420, 280), (0, 0, 0, 0))
    shop.alpha_composite(glow_layer((420, 280), lambda g: g.rounded_rectangle((18, 20, 402, 260), radius=34, fill=(255, 50, 170, 110)), 22))
    d = ImageDraw.Draw(shop)
    d.rounded_rectangle((22, 24, 398, 256), radius=34, fill=(8, 13, 34, 230), outline=(87, 255, 244, 210), width=3)
    neon_text(d, (54, 44), "JUICE IT UP!", 36, (255, 229, 90, 255))
    d.rounded_rectangle((54, 105, 366, 218), radius=20, outline=(255, 80, 180, 180), width=3)
    for i, name in enumerate(["orange", "lime", "apple"]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((54, 54), Image.Resampling.LANCZOS)
        shop.alpha_composite(icon, (82 + i * 86, 132))
    save(shop, "shop_card.png")

    customer = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    customer.alpha_composite(glow_layer((180, 180), lambda g: g.ellipse((24, 22, 156, 154), fill=(255, 70, 180, 130)), 18))
    d = ImageDraw.Draw(customer)
    d.ellipse((32, 28, 148, 148), fill=(255, 206, 154, 255), outline=(121, 255, 245, 230), width=5)
    d.pieslice((22, 4, 158, 100), 180, 360, fill=(32, 25, 60, 255))
    d.arc((58, 80, 82, 106), 10, 170, fill=(30, 42, 62, 255), width=5)
    d.arc((98, 80, 122, 106), 10, 170, fill=(30, 42, 62, 255), width=5)
    d.arc((65, 92, 116, 132), 20, 160, fill=(255, 63, 144, 255), width=6)
    d.text((138, 40), "♥", font=font(28), fill=(255, 75, 181, 255))
    save(customer, "customer_happy.png")


def make_theme_thumbnails() -> None:
    night = Image.new("RGBA", (960, 540), (6, 8, 23, 255))
    night.alpha_composite(glow_layer((960, 540), lambda g: (g.ellipse((10, -60, 350, 220), fill=(0, 255, 240, 105)), g.ellipse((500, 0, 1000, 300), fill=(255, 50, 170, 95))), 38))
    d = ImageDraw.Draw(night)
    for i in range(14):
        x = 18 + i * 70
        h = 95 + (i % 5) * 28
        d.rectangle((x, 540 - h, x + 38, 540), fill=(9, 12, 32, 210))
        for j in range(3):
            d.rectangle((x + 8, 540 - h + 16 + j * 24, x + 16, 540 - h + 27 + j * 24), fill=(255, 217, 120, 100))
    neon_text(d, (44, 30), "Neon", 72, (121, 255, 245, 255))
    neon_text(d, (52, 102), "Night", 72, (255, 75, 181, 255))
    neon_text(d, (58, 188), "MARKET", 42, (255, 223, 92, 255))
    d.text((64, 270), "HIT THE BEAT.", font=font(22), fill=(121, 255, 245, 255))
    d.text((64, 304), "SERVE THE FRUIT.", font=font(22), fill=(255, 75, 181, 255))
    d.polygon([(350, 500), (650, 500), (590, 110), (410, 110)], fill=(8, 13, 34, 225), outline=(121, 255, 245, 170))
    for x in [395, 500, 605]:
        d.line((x, 110, x - 50, 500), fill=(255, 75, 181, 120), width=3)
    d.line((320, 432, 680, 432), fill=(255, 223, 92, 255), width=8)
    for i, name in enumerate(["fruit_berry.png", "fruit_orange.png", "fruit_lime.png", "fruit_apple.png"]):
        icon = Image.open(OUT / name).resize((62, 62), Image.Resampling.LANCZOS)
        night.alpha_composite(icon, (454 + (i % 2) * 74, 144 + i * 65))
    d.rounded_rectangle((704, 128, 908, 356), radius=26, fill=(8, 13, 34, 230), outline=(121, 255, 245, 210), width=3)
    d.text((728, 152), "NIGHT MARKET ORDER", font=font(18), fill=(255, 75, 181, 255))
    d.text((736, 212), "PINEAPPLE      x2", font=font(20), fill=(255, 223, 92, 255))
    d.text((736, 256), "WATERMELON   x1", font=font(20), fill=(255, 75, 181, 255))
    d.text((736, 300), "LIME                 x2", font=font(20), fill=(121, 255, 245, 255))
    d.text((750, 392), "+12,850", font=font(44), fill=(255, 223, 92, 255))
    save(night, "theme_thumb_night.png")


def main() -> None:
    make_background()
    make_logo()
    make_fruit_orbs()
    make_cards()
    make_theme_thumbnails()
    print(f"Generated neon night assets in {OUT}")


if __name__ == "__main__":
    main()
