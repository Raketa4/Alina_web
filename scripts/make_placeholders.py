#!/usr/bin/env python3
"""Генерация плейсхолдеров изображений для сайта Алины Хоняк.

Запуск:  python scripts/make_placeholders.py [--force]

Читает data/projects.json и data/catalog.json, создаёт для каждой
работы файлы <name>-full.jpg (1600 px по большей стороне) и
<name>-thumb.jpg (800 px), а также портрет автора. Соотношение сторон
берётся из поля size («40 × 58 см»), для остальных — по типу работы.

Существующие файлы не перезаписываются без флага --force — так реальные
изображения, положенные вручную, остаются на месте.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WORKS = ROOT / "assets" / "works"
PHOTOS = ROOT / "assets" / "photos"

FORCE = "--force" in sys.argv[1:]

BG = (232, 226, 216)      # тёплый холст
FRAME = (176, 169, 154)   # --canvas
INK = (110, 30, 36)       # --accent
SUB = (120, 112, 100)

SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*[×xх*]\s*(\d+(?:[.,]\d+)?)")


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def font(px: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("georgia.ttf", "Georgia.ttf", "times.ttf", "arial.ttf",
                 "DejaVuSerif.ttf", "DejaVuSans.ttf"):
        for base in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts"),
                     Path("/Library/Fonts")):
            p = base / name
            if p.exists():
                try:
                    return ImageFont.truetype(str(p), px)
                except OSError:
                    pass
    return ImageFont.load_default()


def ratio_from_size(size: str | None) -> float:
    """Отношение ширина/высота."""
    if size:
        m = SIZE_RE.search(size)
        if m:
            w = float(m.group(1).replace(",", "."))
            h = float(m.group(2).replace(",", "."))
            if w > 0 and h > 0:
                return w / h
    return 0.0


def ratio_for(name: str, size: str | None) -> float:
    r = ratio_from_size(size)
    if r:
        return r
    if name.startswith("por-"):
        return 0.8                       # 4 : 5, вертикаль
    if name.startswith("chuvash-wedding-detail"):
        return 1.0
    if name.startswith("chuvash-wedding"):
        return 1.78                      # монументальное горизонтальное полотно
    if name == "artist-portrait":
        return 0.75                      # 3 : 4
    return 0.8


def dims(ratio: float, long_side: int) -> tuple[int, int]:
    if ratio >= 1:
        return long_side, max(1, round(long_side / ratio))
    return max(1, round(long_side * ratio)), long_side


def wrap(draw, text: str, fnt, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def render(path: Path, ratio: float, caption: str, sub: str, long_side: int) -> None:
    w, h = dims(ratio, long_side)
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    pad = max(6, round(min(w, h) * 0.035))
    d.rectangle([pad, pad, w - pad - 1, h - pad - 1], outline=FRAME,
                width=max(1, round(min(w, h) * 0.006)))

    title_fnt = font(max(14, round(min(w, h) * 0.075)))
    sub_fnt = font(max(11, round(min(w, h) * 0.045)))
    inner = w - 4 * pad

    title_lines = wrap(d, caption, title_fnt, inner)
    sub_lines = wrap(d, sub, sub_fnt, inner) if sub else []

    def line_h(fnt):
        b = d.textbbox((0, 0), "Ag", font=fnt)
        return b[3] - b[1]

    tlh, slh = line_h(title_fnt), line_h(sub_fnt)
    gap = round(tlh * 0.35)
    block = len(title_lines) * (tlh + gap)
    if sub_lines:
        block += round(tlh * 0.6) + len(sub_lines) * (slh + gap)
    y = (h - block) / 2

    for ln in title_lines:
        tw = d.textlength(ln, font=title_fnt)
        d.text(((w - tw) / 2, y), ln, font=title_fnt, fill=INK)
        y += tlh + gap
    if sub_lines:
        y += round(tlh * 0.6)
        for ln in sub_lines:
            tw = d.textlength(ln, font=sub_fnt)
            d.text(((w - tw) / 2, y), ln, font=sub_fnt, fill=SUB)
            y += slh + gap

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=82)


def make_pair(name: str, ratio: float, caption: str, sub: str) -> None:
    full = WORKS / f"{name}-full.jpg"
    thumb = WORKS / f"{name}-thumb.jpg"
    for target, long_side in ((full, 1600), (thumb, 800)):
        if target.exists() and not FORCE:
            print(f"  пропуск (есть): {target.relative_to(ROOT)}")
            continue
        render(target, ratio, caption, sub, long_side)
        print(f"  создан: {target.relative_to(ROOT)}  ({dims(ratio, long_side)[0]}×{dims(ratio, long_side)[1]})")


def main() -> int:
    catalog = load("data/catalog.json")
    projects = load("data/projects.json")

    # имя работы -> (соотношение, подпись, подстрока)
    plan: dict[str, tuple[float, str, str]] = {}

    for w in catalog:
        name = Path(w["image"]).stem.replace("-full", "")
        cap = w["title"]["ru"] if isinstance(w["title"], dict) else str(w["title"])
        plan[name] = (ratio_for(name, w.get("size")), cap, w.get("size", ""))

    for p in projects:
        ptitle = p["title"]["ru"] if isinstance(p["title"], dict) else str(p["title"])
        for img in [p.get("cover"), *(p.get("images") or [])]:
            if not img:
                continue
            name = Path(img).stem.replace("-full", "")
            if name in plan:
                continue
            plan[name] = (ratio_for(name, None), ptitle, "эскиз")

    print(f"Работ к генерации: {len(plan)}")
    for name, (ratio, cap, sub) in sorted(plan.items()):
        make_pair(name, ratio, cap, sub)

    # портрет автора
    portrait = PHOTOS / "artist-portrait.jpg"
    if portrait.exists() and not FORCE:
        print(f"  пропуск (есть): {portrait.relative_to(ROOT)}")
    else:
        render(portrait, ratio_for("artist-portrait", None),
               "Портрет автора", "фото: Артём Жигалов", 1400)
        print(f"  создан: {portrait.relative_to(ROOT)}")

    print("Готово.")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())
