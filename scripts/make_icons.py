#!/usr/bin/env python3
"""Растровые иконки сайта (favicon-32.png, apple-touch-icon.png).

Запуск:  python scripts/make_icons.py

SVG-иконка assets/favicon.svg — основная; PNG нужны как запасной вариант
для старых браузеров и iOS. Рисуются монограммой «АХ» на фоне --accent.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"

ACCENT = (110, 30, 36)
CREAM = (247, 245, 241)


def font(px: int):
    for name in ("georgia.ttf", "Georgia.ttf", "times.ttf", "DejaVuSerif.ttf"):
        for base in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts"),
                     Path("/Library/Fonts")):
            p = base / name
            if p.exists():
                try:
                    return ImageFont.truetype(str(p), px)
                except OSError:
                    pass
    return ImageFont.load_default()


def icon(size: int, path: Path) -> None:
    img = Image.new("RGB", (size, size), ACCENT)
    d = ImageDraw.Draw(img)
    fnt = font(round(size * 0.58))
    text = "АХ"
    box = d.textbbox((0, 0), text, font=fnt)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((size - tw) / 2 - box[0], (size - th) / 2 - box[1]), text,
           font=fnt, fill=CREAM)
    img.save(path, "PNG")
    print(f"  создан: {path.relative_to(ROOT)} ({size}×{size})")


def main() -> int:
    icon(32, OUT / "favicon-32.png")
    icon(180, OUT / "apple-touch-icon.png")
    print("Готово.")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())
