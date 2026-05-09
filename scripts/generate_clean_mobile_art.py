#!/usr/bin/env python3
"""Generate the clean modern mobile PNG art pack used by the demo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "game_art" / "clean_mobile"


COLORS = {
    "ink": (38, 45, 58, 255),
    "mint": (113, 203, 135, 255),
    "mint_dark": (62, 159, 101, 255),
    "cream": (255, 250, 239, 255),
    "peach": (255, 121, 142, 255),
    "orange": (255, 177, 76, 255),
    "yellow": (255, 214, 97, 255),
    "blue": (82, 139, 216, 255),
    "purple": (150, 101, 220, 255),
    "leaf": (87, 176, 99, 255),
}


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


def shadow(size: tuple[int, int], shape) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    shape(draw, (0, 0, 0, 120))
    return layer.filter(ImageFilter.GaussianBlur(12))


def fruit_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def add_leaf(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    draw.ellipse((x, y, x + int(42 * scale), y + int(22 * scale)), fill=COLORS["leaf"], outline=(255, 255, 255, 220), width=max(2, int(4 * scale)))
    draw.line((x + int(8 * scale), y + int(14 * scale), x + int(32 * scale), y + int(7 * scale)), fill=(50, 120, 60, 150), width=max(1, int(2 * scale)))


def finish_fruit(img: Image.Image, draw: ImageDraw.ImageDraw, name: str) -> None:
    draw.ellipse((74, 54, 178, 154), fill=(255, 255, 255, 76))
    draw.ellipse((88, 72, 118, 100), fill=(255, 255, 255, 118))
    save(img, f"fruit_{name}.png")


def make_fruits() -> None:
    specs = {
        "apple": COLORS["peach"],
        "orange": COLORS["orange"],
        "lime": COLORS["mint"],
        "berry": COLORS["blue"],
    }
    for name, color in specs.items():
        img, draw = fruit_canvas()
        img.alpha_composite(shadow((256, 256), lambda d, c: d.ellipse((48, 54, 208, 214), fill=c)))
        draw.ellipse((48, 46, 208, 210), fill=color, outline=(255, 255, 255, 255), width=12)
        if name in {"apple", "berry"}:
            add_leaf(draw, 132, 30, 1.0)
        if name in {"orange", "lime"}:
            center = (128, 128)
            for angle in range(0, 360, 45):
                import math

                x = center[0] + int(math.cos(math.radians(angle)) * 62)
                y = center[1] + int(math.sin(math.radians(angle)) * 62)
                draw.line((center[0], center[1], x, y), fill=(255, 255, 255, 105), width=5)
        if name == "berry":
            for x, y in [(92, 132), (134, 118), (150, 152), (112, 160)]:
                draw.ellipse((x, y, x + 14, y + 14), fill=(255, 255, 255, 70))
        finish_fruit(img, draw, name)

    img, draw = fruit_canvas()
    img.alpha_composite(shadow((256, 256), lambda d, c: d.arc((34, 42, 218, 220), 38, 218, fill=c, width=48)))
    draw.arc((34, 42, 218, 220), 38, 218, fill=COLORS["yellow"], width=52)
    draw.arc((52, 62, 202, 204), 42, 208, fill=(255, 255, 255, 130), width=10)
    draw.ellipse((60, 70, 92, 98), fill=(255, 244, 157, 200))
    save(img, "fruit_banana.png")

    img, draw = fruit_canvas()
    img.alpha_composite(shadow((256, 256), lambda d, c: d.ellipse((50, 50, 206, 214), fill=c)))
    for i, (x, y) in enumerate([(92, 74), (142, 78), (116, 116), (76, 132), (156, 136), (118, 168)]):
        draw.ellipse((x - 34, y - 34, x + 34, y + 34), fill=COLORS["purple"] if i % 2 else (177, 133, 242, 255), outline=(255, 255, 255, 235), width=6)
    add_leaf(draw, 126, 34, 1.0)
    save(img, "fruit_grape.png")


def rounded_card(size: tuple[int, int], fill: tuple[int, int, int, int], radius: int = 36) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.alpha_composite(shadow(size, lambda d, c: d.rounded_rectangle((18, 22, size[0] - 18, size[1] - 16), radius=radius, fill=c)))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((12, 10, size[0] - 12, size[1] - 18), radius=radius, fill=fill, outline=(255, 255, 255, 240), width=4)
    return img


def make_ui_assets() -> None:
    logo = Image.new("RGBA", (720, 240), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)
    title_font = font(72)
    sub_font = font(34, False)
    title = "Fruit Beat"
    subtitle = "Rhythm Fruit Shop"
    icon_w = 120
    gap = 26
    title_box = draw.textbbox((0, 0), title, font=title_font)
    sub_box = draw.textbbox((0, 0), subtitle, font=sub_font)
    text_w = max(title_box[2] - title_box[0], sub_box[2] - sub_box[0])
    group_w = icon_w + gap + text_w
    group_x = (720 - group_w) // 2
    icon = Image.open(OUT / "fruit_orange.png").resize((102, 102), Image.Resampling.LANCZOS)
    logo.alpha_composite(icon, (group_x + 8, 58))
    melon = Image.open(OUT / "fruit_lime.png").resize((62, 62), Image.Resampling.LANCZOS)
    logo.alpha_composite(melon, (group_x + 62, 105))
    text_x = group_x + icon_w + gap
    draw.text((text_x, 44), title, font=title_font, fill=COLORS["ink"])
    draw.text((text_x + 3, 126), subtitle, font=sub_font, fill=COLORS["mint_dark"])
    save(logo, "brand_logo.png")

    shop = rounded_card((360, 240), (255, 255, 255, 245), 34)
    draw = ImageDraw.Draw(shop)
    draw.rounded_rectangle((54, 68, 306, 208), radius=18, fill=(246, 235, 205, 255), outline=(96, 142, 88, 255), width=4)
    draw.rectangle((54, 68, 306, 100), fill=(113, 203, 135, 255))
    for i in range(5):
        x = 58 + i * 49
        draw.pieslice((x, 78, x + 54, 130), 0, 180, fill=(255, 255, 255, 255) if i % 2 else (113, 203, 135, 255))
    draw.text((118, 112), "FRESH & FUN", font=font(18), fill=(255, 255, 255, 255))
    for i, fruit_name in enumerate(["apple", "orange", "lime", "grape"]):
        icon = Image.open(OUT / f"fruit_{fruit_name}.png").resize((38, 38), Image.Resampling.LANCZOS)
        shop.alpha_composite(icon, (82 + i * 48, 150))
    save(shop, "shop_card.png")

    customer = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(customer)
    d.ellipse((24, 22, 136, 136), fill=(255, 218, 164, 255), outline=(255, 255, 255, 255), width=8)
    d.pieslice((18, 8, 142, 90), 180, 360, fill=(84, 54, 36, 255))
    d.ellipse((54, 76, 66, 88), fill=COLORS["ink"])
    d.ellipse((94, 76, 106, 88), fill=COLORS["ink"])
    d.arc((58, 82, 104, 116), 20, 160, fill=(207, 89, 99, 255), width=5)
    d.rounded_rectangle((34, 116, 126, 154), radius=20, fill=COLORS["mint"])
    save(customer, "customer_happy.png")

    for name, color, glyph in [
        ("icon_music", COLORS["mint"], "♪"),
        ("icon_order", COLORS["peach"], "袋"),
        ("icon_star", COLORS["yellow"], "★"),
        ("icon_shop", COLORS["mint_dark"], "店"),
        ("icon_heart", COLORS["peach"], "♥"),
        ("icon_pause", (255, 255, 255, 255), "Ⅱ"),
    ]:
        img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        img.alpha_composite(shadow((128, 128), lambda d, c: d.ellipse((18, 20, 110, 112), fill=c)))
        d = ImageDraw.Draw(img)
        d.ellipse((16, 14, 112, 110), fill=color, outline=(255, 255, 255, 255), width=6)
        fill = COLORS["ink"] if name == "icon_pause" else (255, 255, 255, 255)
        bbox = d.textbbox((0, 0), glyph, font=font(42))
        d.text(((128 - (bbox[2] - bbox[0])) / 2, 36), glyph, font=font(42), fill=fill)
        save(img, f"{name}.png")

    bg = Image.new("RGBA", (1280, 720), (250, 255, 249, 255))
    d = ImageDraw.Draw(bg)
    d.ellipse((-180, 560, 360, 890), fill=(213, 245, 222, 255))
    d.ellipse((1030, -120, 1380, 250), fill=(232, 249, 229, 255))
    d.ellipse((1160, 60, 1320, 220), fill=(255, 183, 76, 210), outline=(255, 255, 255, 255), width=8)
    d.ellipse((-80, -70, 120, 130), fill=(255, 121, 142, 210), outline=(255, 255, 255, 255), width=8)
    for x, y in [(240, 60), (1040, 620), (860, 72), (180, 620)]:
        d.ellipse((x, y, x + 42, y + 18), fill=(113, 203, 135, 130))
    save(bg, "background_clean.png")

    hero = Image.new("RGBA", (960, 540), (250, 255, 249, 255))
    d = ImageDraw.Draw(hero)
    d.ellipse((-120, 370, 280, 640), fill=(214, 245, 222, 255))
    d.ellipse((790, -80, 1060, 170), fill=(232, 249, 229, 255))
    d.ellipse((-60, -60, 100, 100), fill=(255, 121, 142, 170), outline=(255, 255, 255, 255), width=6)
    d.ellipse((850, -20, 1010, 130), fill=(255, 177, 76, 190), outline=(255, 255, 255, 255), width=6)
    d.text((72, 82), "Fruit Beat", font=font(54), fill=COLORS["ink"])
    d.text((76, 142), "Rhythm Fruit Shop", font=font(26, False), fill=COLORS["mint_dark"])
    d.text((70, 222), "Tap to the Beat,", font=font(34), fill=COLORS["ink"])
    d.text((70, 264), "Serve with Style!", font=font(34), fill=COLORS["ink"])
    for idx, (label, color) in enumerate([("Rhythm Tap Gameplay", COLORS["mint"]), ("Complete Orders", COLORS["peach"]), ("Unlock New Shops", COLORS["yellow"])]):
        cy = 344 + idx * 52
        d.ellipse((72, cy - 18, 108, cy + 18), fill=color)
        d.text((122, cy - 14), label, font=font(16), fill=COLORS["ink"])
    d.rounded_rectangle((386, 20, 616, 520), radius=46, fill=(255, 255, 255, 255), outline=(38, 45, 58, 255), width=7)
    d.rounded_rectangle((411, 70, 591, 462), radius=34, fill=(239, 250, 242, 255))
    d.line((426, 390, 576, 390), fill=COLORS["mint"], width=8)
    d.ellipse((476, 400, 536, 460), fill=COLORS["ink"])
    for i, name in enumerate(["berry", "apple", "orange", "lime"]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((56, 56), Image.Resampling.LANCZOS)
        hero.alpha_composite(icon, (454 + (i % 2) * 58, 126 + i * 62))
    d.rounded_rectangle((682, 136, 910, 248), radius=28, fill=(255, 255, 255, 245), outline=(230, 238, 233, 255), width=2)
    d.text((704, 154), "CURRENT ORDER", font=font(15), fill=COLORS["mint_dark"])
    avatar = Image.open(OUT / "customer_happy.png").resize((58, 58), Image.Resampling.LANCZOS)
    hero.alpha_composite(avatar, (704, 176))
    for i, name in enumerate(["apple", "orange", "lime"]):
        icon = Image.open(OUT / f"fruit_{name}.png").resize((38, 38), Image.Resampling.LANCZOS)
        hero.alpha_composite(icon, (772 + i * 40, 184))
    d.rounded_rectangle((704, 230, 852, 241), radius=6, fill=COLORS["mint"])
    d.rounded_rectangle((698, 286, 904, 382), radius=24, fill=(255, 255, 255, 230), outline=(232, 239, 234, 255), width=2)
    d.text((724, 308), "Coins Earned      320", font=font(17), fill=COLORS["ink"])
    d.text((724, 342), "Best Combo          48", font=font(17), fill=COLORS["ink"])
    shop_icon = Image.open(OUT / "shop_card.png").resize((178, 118), Image.Resampling.LANCZOS)
    hero.alpha_composite(shop_icon, (716, 395))
    save(hero, "theme_thumb_day.png")


def main() -> None:
    make_fruits()
    make_ui_assets()
    print(f"Generated art assets in {OUT}")


if __name__ == "__main__":
    main()
