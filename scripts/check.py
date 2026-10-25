#!/usr/bin/env python3
"""Проверки целостности статического сайта Алины Хоняк.

Запуск:  python scripts/check.py

Выполняет четыре проверки:
  1. Наборы ключей в i18n/ru.json и i18n/en.json полностью совпадают.
  2. Все data/*.json валидны и содержат обязательные поля по схеме.
  3. Каждый путь к изображению из data/*.json существует на диске.
  4. Каждая внутренняя ссылка в *.html указывает на существующий файл.

Код возврата 0 — всё зелёное, 1 — есть ошибки.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:  # читаемый вывод кириллицы в консоли Windows
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent

errors: list[str] = []
checks_run = 0


def fail(msg: str) -> None:
    errors.append(msg)


def load_json(rel: str):
    path = ROOT / rel
    if not path.exists():
        fail(f"[файл отсутствует] {rel}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"[невалидный JSON] {rel}: {exc}")
        return None


# --- Проверка 1: совпадение ключей словарей -------------------------------

def flatten_keys(obj, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            path = f"{prefix}.{k}" if prefix else k
            keys.add(path)
            keys |= flatten_keys(v, path)
    return keys


def check_i18n_parity() -> None:
    global checks_run
    ru = load_json("i18n/ru.json")
    en = load_json("i18n/en.json")
    if ru is None or en is None:
        return
    checks_run += 1
    ru_keys = flatten_keys(ru)
    en_keys = flatten_keys(en)
    only_ru = sorted(ru_keys - en_keys)
    only_en = sorted(en_keys - ru_keys)
    for k in only_ru:
        fail(f"[i18n] ключ есть в ru.json, нет в en.json: {k}")
    for k in only_en:
        fail(f"[i18n] ключ есть в en.json, нет в ru.json: {k}")


# --- Проверка 2: схема данных -------------------------------------------

def require(item: dict, fields: tuple[str, ...], where: str) -> None:
    for f in fields:
        if f not in item or item[f] in (None, "", [], {}):
            fail(f"[схема] {where}: отсутствует или пусто поле '{f}'")


def check_bilingual(value, where: str) -> None:
    if not isinstance(value, dict) or "ru" not in value or "en" not in value:
        fail(f"[схема] {where}: ожидался объект с ключами ru/en")


def check_data_schema() -> None:
    global checks_run

    # каждый файл в data/ обязан быть валидным JSON
    for path in sorted((ROOT / "data").glob("*.json")):
        checks_run += 1
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"[невалидный JSON] data/{path.name}: {exc}")

    site = load_json("data/site.json")
    if site is not None:
        checks_run += 1
        require(site, ("name", "role", "social"), "site.json")
        for key in ("name", "role", "intro"):
            if isinstance(site.get(key), dict):
                check_bilingual(site[key], f"site.json.{key}")

    projects = load_json("data/projects.json")
    if projects is not None:
        checks_run += 1
        if not isinstance(projects, list) or not projects:
            fail("[схема] projects.json: ожидался непустой список")
        else:
            slugs = set()
            for i, p in enumerate(projects):
                where = f"projects.json[{i}]"
                require(p, ("slug", "title", "year", "description", "cover"), where)
                if isinstance(p.get("title"), dict):
                    check_bilingual(p["title"], f"{where}.title")
                if isinstance(p.get("description"), dict):
                    check_bilingual(p["description"], f"{where}.description")
                slug = p.get("slug")
                if slug in slugs:
                    fail(f"[схема] projects.json: дублирующийся slug '{slug}'")
                slugs.add(slug)

    catalog = load_json("data/catalog.json")
    if catalog is not None:
        checks_run += 1
        valid_status = {"available", "reserved", "sold"}
        if not isinstance(catalog, list) or not catalog:
            fail("[схема] catalog.json: ожидался непустой список")
        else:
            ids = set()
            for i, w in enumerate(catalog):
                where = f"catalog.json[{i}]"
                require(w, ("id", "title", "year", "medium", "size", "status", "image"), where)
                if isinstance(w.get("title"), dict):
                    check_bilingual(w["title"], f"{where}.title")
                if isinstance(w.get("medium"), dict):
                    check_bilingual(w["medium"], f"{where}.medium")
                if w.get("status") not in valid_status:
                    fail(f"[схема] {where}: status '{w.get('status')}' не из {sorted(valid_status)}")
                wid = w.get("id")
                if wid in ids:
                    fail(f"[схема] catalog.json: дублирующийся id '{wid}'")
                ids.add(wid)

    cv = load_json("data/cv.json")
    if cv is not None:
        checks_run += 1
        for section in ("education", "teaching", "exhibitions", "awards", "publications"):
            if section not in cv or not isinstance(cv[section], list):
                fail(f"[схема] cv.json: секция '{section}' отсутствует или не список")


# --- Проверка 3: изображения существуют --------------------------------

def collect_image_paths() -> list[tuple[str, str]]:
    """Возвращает список (источник, относительный путь картинки)."""
    out: list[tuple[str, str]] = []
    projects = load_json("data/projects.json")
    if isinstance(projects, list):
        for p in projects:
            if p.get("cover"):
                out.append((f"projects/{p.get('slug')}", p["cover"]))
            for img in p.get("images", []) or []:
                out.append((f"projects/{p.get('slug')}", img))
    catalog = load_json("data/catalog.json")
    if isinstance(catalog, list):
        for w in catalog:
            if w.get("image"):
                out.append((f"catalog/{w.get('id')}", w["image"]))
    site = load_json("data/site.json")
    if isinstance(site, dict) and site.get("portrait"):
        out.append(("site.portrait", site["portrait"]))
    return out


def check_images_exist() -> None:
    global checks_run
    paths = collect_image_paths()
    if not paths:
        return
    checks_run += 1
    for src, rel in paths:
        rel_norm = rel.lstrip("/")
        if not (ROOT / rel_norm).exists():
            fail(f"[изображение] {src}: файл не найден — {rel}")
        # ожидаем пары -full / -thumb для работ
        if "/works/" in rel_norm and rel_norm.endswith("-full.jpg"):
            thumb = rel_norm.replace("-full.jpg", "-thumb.jpg")
            if not (ROOT / thumb).exists():
                fail(f"[изображение] {src}: нет миниатюры — {thumb}")


# --- Проверка 4: внутренние ссылки -------------------------------------

HREF_RE = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"', re.IGNORECASE)
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "//", "#", "data:")


def check_internal_links() -> None:
    global checks_run
    html_files = sorted(ROOT.glob("*.html"))
    if not html_files:
        return
    checks_run += 1
    for html in html_files:
        text = html.read_text(encoding="utf-8")
        text = re.sub(r"<base\b[^>]*>", "", text, flags=re.IGNORECASE)  # <base href> задаёт корень, не ссылка
        for raw in HREF_RE.findall(text):
            link = raw.strip()
            if not link or link.startswith(EXTERNAL_PREFIXES):
                continue
            target = link.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            if not (ROOT / target).exists():
                fail(f"[ссылка] {html.name}: битая внутренняя ссылка — {link}")


# --- Проверка: шрифты и фон --------------------------------------------

FORBIDDEN_FONTS = ("Cormorant", "EB Garamond", "EB+Garamond", "family=Inter", "Oracle", "Alpha_Book")


def check_fonts() -> None:
    global checks_run
    checks_run += 1
    css = (ROOT / "css/styles.css").read_text(encoding="utf-8")
    for path in [ROOT / "css/styles.css", *sorted(ROOT.glob("*.html"))]:
        text = path.read_text(encoding="utf-8")
        for bad in FORBIDDEN_FONTS:
            if bad in text:
                fail(f"[шрифты] {path.name}: найден запрещённый шрифт '{bad}'")
    if "family=Onest" not in css:
        fail("[шрифты] styles.css: не подключён Onest")
    root = re.search(r":root\s*\{([^}]*)\}", css)
    if not root or not re.search(r"--bg:\s*#FFFFFF\s*;", root.group(1), re.IGNORECASE):
        fail("[шрифты] styles.css: --bg в :root должен быть #FFFFFF")


# --- Проверка: меню-плитка и общая шапка -------------------------------

MENU_ORDER = ["home", "studio", "about", "shop", "series", "info", "projects", "contacts"]
ABOUT_CHILDREN = ["cv", "statement", "teaching", "curatorial", "publications"]


def i18n_has(d: dict, key: str) -> bool:
    node = d
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            return False
        node = node[part]
    return isinstance(node, str)


def check_menu() -> None:
    global checks_run
    menu = load_json("data/menu.json")
    ru = load_json("i18n/ru.json") or {}
    if menu is None:
        fail("[меню] data/menu.json отсутствует")
        return
    checks_run += 1
    ids = [m.get("id") for m in menu] if isinstance(menu, list) else []
    if ids != MENU_ORDER:
        fail(f"[меню] порядок пунктов {ids}, ожидался {MENU_ORDER}")
    items = list(menu) if isinstance(menu, list) else []
    for m in items:
        if m.get("id") == "about":
            kids = [c.get("id") for c in m.get("children", [])]
            if kids != ABOUT_CHILDREN:
                fail(f"[меню] подпункты «Об авторе» {kids}, ожидались {ABOUT_CHILDREN}")
            items += m.get("children", [])
        if m.get("id") == "shop" and "href" in m:
            fail("[меню] у пункта shop не должно быть href (ссылка берётся из site.shop_url)")
    for m in items:
        if m.get("i18n") and not i18n_has(ru, m["i18n"]):
            fail(f"[меню] ключ {m['i18n']} отсутствует в i18n/ru.json")
        if m.get("href") and not (ROOT / m["href"]).exists():
            fail(f"[меню] {m.get('id')}: файл не найден — {m['href']}")


def check_no_inline_chrome() -> None:
    global checks_run
    checks_run += 1
    for html in sorted(ROOT.glob("*.html")):
        text = html.read_text(encoding="utf-8")
        for cls in ("site-header", "site-nav", "site-footer"):
            if f'class="{cls}"' in text:
                fail(f"[разметка] {html.name} содержит {cls} — шапку и подвал вставляет js/chrome.js")


I18N_KEY_RES = (
    re.compile(r'data-i18n="([\w.]+)"'),
    re.compile(r'data-i18n-attr="([^"]+)"'),
    re.compile(r"\bt\('([\w.]+)'\)"),
)


def check_i18n_keys_used_exist() -> None:
    global checks_run
    ru = load_json("i18n/ru.json")
    if ru is None:
        return
    checks_run += 1
    for path in [*sorted(ROOT.glob("*.html")), *sorted((ROOT / "js").glob("*.js"))]:
        text = path.read_text(encoding="utf-8")
        if path.suffix == ".js":  # примеры в комментариях — не использование ключей
            text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
        keys = set(I18N_KEY_RES[0].findall(text)) | set(I18N_KEY_RES[2].findall(text))
        for attr in I18N_KEY_RES[1].findall(text):
            keys |= {pair.split(":", 1)[1].strip() for pair in attr.split(",") if ":" in pair}
        for key in sorted(keys):
            if not i18n_has(ru, key):
                fail(f"[i18n] {path.name}: ключ '{key}' отсутствует в ru.json")


# --- main --------------------------------------------------------------

CHECKS = {
    "menu": check_menu,
    "chrome": check_no_inline_chrome,
    "keys": check_i18n_keys_used_exist,
    "i18n": check_i18n_parity,
    "schema": check_data_schema,
    "images": check_images_exist,
    "links": check_internal_links,
    "fonts": check_fonts,
}


def main() -> int:
    # python scripts/check.py [имя ...] — запустить только перечисленные проверки
    names = sys.argv[1:] or list(CHECKS)
    for name in names:
        if name not in CHECKS:
            print(f"Неизвестная проверка: {name}. Доступны: {', '.join(CHECKS)}")
            return 2
        CHECKS[name]()

    if errors:
        print(f"НАЙДЕНЫ ОШИБКИ ({len(errors)}):\n")
        for e in errors:
            print("  •", e)
        print(f"\nПроверок выполнено: {checks_run}")
        return 1

    print(f"OK — все проверки пройдены (выполнено проверок: {checks_run}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
