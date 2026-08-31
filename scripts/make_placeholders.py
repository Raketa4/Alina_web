#!/usr/bin/env python3
"""Подготовка изображений для сайта Алины Хоняк.

Запуск:
  python scripts/make_placeholders.py            обычный режим
  python scripts/make_placeholders.py --thumbs    пересобрать все миниатюры
  python scripts/make_placeholders.py --force      всё заново плейсхолдерами

Что делает обычный режим (ничего не ломает):
  • для каждой работы из data/catalog.json и data/projects.json проверяет
    пару файлов assets/works/<id>-full.jpg и <id>-thumb.jpg;
  • если -full нет — рисует серый плейсхолдер с названием;
  • если -thumb нет, но -full есть (в т.ч. настоящее фото) — делает
    миниатюру ~800 px из -full;
  • то же для портрета assets/photos/artist-portrait.jpg.

--thumbs  пересоздаёт ВСЕ -thumb.jpg из -full.jpg (полезно после замены фото;
          сами -full не трогает).
--force   перерисовывает всё плейсхолдерами — стирает настоящие картинки,
          пользоваться только если нужно начать с нуля.
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

ARGS = sys.argv[1:]
FORCE = "--force" in ARGS
REBUILD_THUMBS = "--thumbs" in ARGS

FULL_SIDE = 1600
THUMB_SIDE = 800

BG = (232, 226, 216)
FRAME = (176, 169, 154)
INK = (110, 30, 36)
SUB = (120, 112, 100)

SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*[×xх*]\s*(\d+(?:[.,]\d+)?)")


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def font(px: int):
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
        return 0.8
    if name.startswith("chuvash-wedding-detail"):
        return 1.0
    if name.startswith("chuvash-wedding"):
        return 1.78
    if name == "artist-portrait":
        return 0.75
    return 0.8


def dims(ratio: float, long_side: int) -> tuple[int, int]:
    if ratio >= 1:
        return long_side, max(1, round(long_side / ratio))
    return max(1, round(long_side * ratio)), long_side


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
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


def render_placeholder(path: Path, ratio: float, caption: str, sub: str, long_side: int) -> None:
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
        d.text(((w - d.textlength(ln, font=title_fnt)) / 2, y), ln, font=title_fnt, fill=INK)
        y += tlh + gap
    if sub_lines:
        y += round(tlh * 0.6)
        for ln in sub_lines:
            d.text(((w - d.textlength(ln, font=sub_fnt)) / 2, y), ln, font=sub_fnt, fill=SUB)
            y += slh + gap
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=82)


def downscale(src: Path, dst: Path, long_side: int) -> None:
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        scale = long_side / max(w, h)
        if scale < 1:
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "JPEG", quality=84)


def process(name: str, ratio: float, caption: str, sub: str) -> None:
    full = WORKS / f"{name}-full.jpg"
    thumb = WORKS / f"{name}-thumb.jpg"

    if FORCE or not full.exists():
        render_placeholder(full, ratio, caption, sub, FULL_SIDE)
        print(f"  плейсхолдер: {full.relative_to(ROOT)}")

    if FORCE:
        render_placeholder(thumb, ratio, caption, sub, THUMB_SIDE)
        print(f"  плейсхолдер: {thumb.relative_to(ROOT)}")
    elif REBUILD_THUMBS or not thumb.exists():
        if full.exists():
            downscale(full, thumb, THUMB_SIDE)
            print(f"  миниатюра из -full: {thumb.relative_to(ROOT)}")
        else:
            render_placeholder(thumb, ratio, caption, sub, THUMB_SIDE)
            print(f"  плейсхолдер: {thumb.relative_to(ROOT)}")
    else:
        print(f"  ок: {full.name} + {thumb.name}")


def main() -> int:
    catalog = load("data/catalog.json")
    projects = load("data/projects.json")

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
            plan.setdefault(name, (ratio_for(name, None), ptitle, "эскиз"))

    mode = "--force" if FORCE else ("--thumbs" if REBUILD_THUMBS else "обычный")
    print(f"Режим: {mode}. Работ: {len(plan)}")
    for name, (ratio, cap, sub) in sorted(plan.items()):
        process(name, ratio, cap, sub)

    portrait = PHOTOS / "artist-portrait.jpg"
    if FORCE or not portrait.exists():
        render_placeholder(portrait, ratio_for("artist-portrait", None),
                           "Портрет автора", "фото: Артём Жигалов", 1400)
        print(f"  плейсхолдер: {portrait.relative_to(ROOT)}")
    else:
        print(f"  ок: {portrait.name}")

    print("Готово.")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())
