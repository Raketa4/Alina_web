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


def check_unique_slugs(items: list, name: str) -> None:
    slugs = [i.get("slug") for i in items]
    for slug in {x for x in slugs if slugs.count(x) > 1}:
        fail(f"[схема] {name}: дублирующийся slug '{slug}'")


def check_series_schema() -> None:
    global checks_run
    series = load_json("data/series.json")
    if series is None:
        fail("[схема] series.json отсутствует")
        return
    checks_run += 1
    if not isinstance(series, list) or not series:
        fail("[схема] series.json: ожидался непустой список")
        return
    check_unique_slugs(series, "series.json")
    if {s.get("slug") for s in series} != {"mountains-and-sea", "portraits"}:
        fail(f"[схема] series.json: слаги {[s.get('slug') for s in series]}, ожидались mountains-and-sea, portraits")
    for i, s in enumerate(series):
        where = f"series.json[{i}]"
        require(s, ("slug", "title", "summary", "cover", "works"), where)
        for key in ("title", "summary"):
            if isinstance(s.get(key), dict):
                check_bilingual(s[key], f"{where}.{key}")
        for j, w in enumerate(s.get("works") or []):
            require(w, ("id", "src", "title"), f"{where}.works[{j}]")
            for banned in ("status", "price"):
                if banned in w:
                    fail(f"[схема] {where}.works[{j}]: поля '{banned}' быть не должно — продажа в магазине")


def check_projects_schema() -> None:
    global checks_run
    projects = load_json("data/projects.json")
    if projects is None:
        return
    checks_run += 1
    if not isinstance(projects, list) or not projects:
        fail("[схема] projects.json: ожидался непустой список")
        return
    check_unique_slugs(projects, "projects.json")
    if {p.get("slug") for p in projects} != {"chuvash-wedding"}:
        fail(f"[схема] projects.json: слаги {[p.get('slug') for p in projects]}, ожидался chuvash-wedding")
    for i, p in enumerate(projects):
        where = f"projects.json[{i}]"
        require(p, ("slug", "title", "summary", "text", "cover", "images"), where)
        for key in ("title", "summary", "text"):
            if isinstance(p.get(key), dict):
                check_bilingual(p[key], f"{where}.{key}")


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

    check_series_schema()
    check_projects_schema()
    if (ROOT / "data/catalog.json").exists():
        fail("[схема] data/catalog.json должен быть удалён — работы живут в series.json")

    home = load_json("data/home.json")
    if home is None:
        fail("[схема] home.json отсутствует")
    else:
        checks_run += 1
        hero = home.get("hero") or {}
        require(hero, ("image", "text"), "home.json.hero")
        require(home, ("photos", "text"), "home.json")
        for key in ("text",):
            if isinstance(hero.get(key), dict):
                check_bilingual(hero[key], f"home.json.hero.{key}")
        if isinstance(home.get("text"), dict):
            check_bilingual(home["text"], "home.json.text")
    if isinstance(site, dict) and "featured" in site:
        fail("[схема] site.json: поле featured больше не используется — удалить")

    studio = load_json("data/studio.json")
    if studio is None:
        fail("[схема] studio.json отсутствует")
    else:
        checks_run += 1
        require(studio, ("text", "images"), "studio.json")
        if isinstance(studio.get("text"), dict):
            check_bilingual(studio["text"], "studio.json.text")

    info = load_json("data/info.json")
    if info is not None:
        checks_run += 1
        ids = [x.get("id") for x in info] if isinstance(info, list) else []
        if ids != ["privacy", "returns"]:
            fail(f"[схема] info.json: разделы {ids}, ожидались ['privacy', 'returns']")
        privacy = next((x for x in info if x.get("id") == "privacy"), {}) if isinstance(info, list) else {}
        if "FormSubmit" not in " ".join((privacy.get("body") or {}).get("ru") or []):
            fail("[схема] info.json: политика privacy должна упоминать FormSubmit")

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
    for p in load_json("data/projects.json") or []:
        for img in [p.get("cover"), *(p.get("images") or [])]:
            if img:
                out.append((f"projects/{p.get('slug')}", img))
    if (ROOT / "data/series.json").exists():
        for s in load_json("data/series.json") or []:
            for img in [s.get("cover"), *[w.get("src") for w in s.get("works") or []]]:
                if img:
                    out.append((f"series/{s.get('slug')}", img))
    if (ROOT / "data/home.json").exists():
        home = load_json("data/home.json") or {}
        for img in [(home.get("hero") or {}).get("image"), *(home.get("photos") or [])]:
            if img:
                out.append(("home", img))
    if (ROOT / "data/sections.json").exists():
        for key, sec in (load_json("data/sections.json") or {}).items():
            for img in sec.get("images") or []:
                out.append((f"sections/{key}", img))
    if (ROOT / "data/studio.json").exists():
        for img in (load_json("data/studio.json") or {}).get("images") or []:
            out.append(("studio", img))
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


# --- Проверка: просмотрщик ---------------------------------------------

def check_viewer() -> None:
    global checks_run
    checks_run += 1
    if "initLightbox" in (ROOT / "js/ui.js").read_text(encoding="utf-8"):
        fail("[просмотрщик] js/ui.js всё ещё содержит initLightbox")
    viewer = ROOT / "js/viewer.js"
    if not viewer.exists():
        fail("[просмотрщик] js/viewer.js отсутствует")
    elif "export function initViewer" not in viewer.read_text(encoding="utf-8"):
        fail("[просмотрщик] js/viewer.js не экспортирует initViewer")
    ru = load_json("i18n/ru.json") or {}
    for key in ("common.prev", "common.next", "common.close"):
        if not i18n_has(ru, key):
            fail(f"[просмотрщик] нет ключа {key} в i18n/ru.json")


# --- Проверка: страницы серий и проектов --------------------------------

def check_detail_pages_have_not_found() -> None:
    global checks_run
    checks_run += 1
    for rel in ("js/series-view.js", "js/project.js"):
        path = ROOT / rel
        if not path.exists() or "notFoundTitle" not in path.read_text(encoding="utf-8"):
            fail(f"[страницы] {rel}: нет состояния «не найдено» для неизвестного slug")


def check_no_captions_in_series() -> None:
    global checks_run
    checks_run += 1
    path = ROOT / "js/series-view.js"
    if not path.exists():
        fail("[страницы] js/series-view.js отсутствует")
        return
    text = path.read_text(encoding="utf-8")
    for bad in ("work-meta", "work-title", "medium", "size", "price", "status"):
        if bad in text:
            fail(f"[страницы] series-view.js: '{bad}' — под работами в серии подписей быть не должно")


# --- Проверка: следов каталога не осталось ------------------------------

SALE_WORDS = ("приобрести", "купить", "цена", "заявк")


def check_no_catalog_refs() -> None:
    global checks_run
    checks_run += 1
    for html in sorted(ROOT.glob("*.html")):
        head = html.read_text(encoding="utf-8").split("</head>", 1)[0].lower()
        for word in SALE_WORDS:
            if word in head:
                fail(f"[каталог] {html.name}: в <head> осталось «{word}» — продажа ушла в магазин")
    paths = [*ROOT.glob("*.html"), *(ROOT / "js").glob("*.js"), *(ROOT / "i18n").glob("*.json")]
    for path in sorted(paths):
        if "catalog" in path.read_text(encoding="utf-8"):
            fail(f"[каталог] {path.relative_to(ROOT).as_posix()}: упоминание catalog")


# --- Проверка: «Об авторе» и подразделы ---------------------------------

ABOUT_SECTIONS = ("cv", "statement", "teaching", "curatorial", "publications")


def check_about_sections() -> None:
    global checks_run
    checks_run += 1
    for name in ABOUT_SECTIONS:
        page = ROOT / f"{name}.html"
        if not page.exists():
            fail(f"[об авторе] {name}.html отсутствует")
        elif f'data-section="{name}"' not in page.read_text(encoding="utf-8"):
            fail(f"[об авторе] {name}.html: нет data-section=\"{name}\"")
    sections = load_json("data/sections.json")
    if sections is not None:
        for key in ("teaching", "curatorial", "publications"):
            if not (sections.get(key) or {}).get("images"):
                fail(f"[об авторе] sections.json: у '{key}' нет images")
    site = load_json("data/site.json") or {}
    check_bilingual(site.get("about_short"), "site.json.about_short")


# --- Проверка: форма связи ---------------------------------------------

FORM_ACTION = "https://formsubmit.co/alinakhoniak@gmail.com"
FORM_NEXT = "https://raketa4.github.io/Alina_web/contacts.html?sent=1"


def check_contact_form() -> None:
    global checks_run
    checks_run += 1
    html = (ROOT / "contacts.html").read_text(encoding="utf-8")
    if f'action="{FORM_ACTION}"' not in html:
        fail(f"[форма] contacts.html: action формы должен быть {FORM_ACTION}")
    for name in ("name", "email", "message", "consent"):
        if f'name="{name}"' not in html:
            fail(f"[форма] contacts.html: нет поля name=\"{name}\"")
    if f'name="_next" value="{FORM_NEXT}"' not in html:
        fail(f"[форма] contacts.html: скрытое поле _next должно вести на {FORM_NEXT}")
    site = load_json("data/site.json") or {}
    if site.get("email") != "alinakhoniak@gmail.com":
        fail("[форма] site.json: email должен быть alinakhoniak@gmail.com")


# --- main --------------------------------------------------------------

CHECKS = {
    "form": check_contact_form,
    "about": check_about_sections,
    "nocatalog": check_no_catalog_refs,
    "notfound": check_detail_pages_have_not_found,
    "captions": check_no_captions_in_series,
    "viewer": check_viewer,
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
