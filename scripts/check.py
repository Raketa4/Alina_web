#!/usr/bin/env python3
"""Проверки целостности статического сайта Алины Хоняк.

Запуск:  python scripts/check.py             — все проверки
         python scripts/check.py keys fonts  — только перечисленные

Проверяет словари i18n (совпадение ru/en, что каждый ключ существует и
используется), схемы data/*.json, наличие картинок, внутренние ссылки,
шрифт, меню и шапку, адреса для поисковиков, страницы «Об авторе», «Инфо»,
контакты и мастерскую. Полный список с именами — словарь CHECKS внизу файла.

Код возврата 0 — всё зелёное, 1 — есть ошибки, 2 — неизвестное имя проверки.
"""
from __future__ import annotations

import functools
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
    for i, s in enumerate(series):
        where = f"series.json[{i}]"
        require(s, ("slug", "title", "works"), where)
        check_bilingual(s.get("title"), f"{where}.title")
        for j, w in enumerate(s.get("works") or []):
            at = f"{where}.works[{j}]"
            require(w, ("id", "src", "width", "height"), at)
            # подпись (title, size, medium, year) — по желанию: у серий без описаний её нет
            for key in ("title", "medium"):
                if key in w:
                    check_bilingual(w[key], f"{at}.{key}")
            for banned in ("status", "price"):
                if banned in w:
                    fail(f"[схема] {at}: поля '{banned}' быть не должно — продажа в магазине")
            # размеры в данных резервируют место под картину в ленте до загрузки
            src = ROOT / str(w.get("src") or "")
            size = jpeg_size(src) if src.is_file() else None
            if size and size != (w.get("width"), w.get("height")):
                fail(f"[схема] {at}: width/height {w.get('width')}×{w.get('height')}, а у файла {size[0]}×{size[1]}")


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
    for i, p in enumerate(projects):
        where = f"projects.json[{i}]"
        require(p, ("slug", "title", "summary", "text", "cover", "images"), where)
        for key in ("title", "summary", "text"):
            if isinstance(p.get(key), dict):
                check_bilingual(p[key], f"{where}.{key}")
        # обложка — главная картинка вверху страницы проекта, в сетке её не повторяем
        if p.get("cover") in (p.get("images") or []):
            fail(f"[схема] {where}: обложка {p.get('cover')} повторяется в images")


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
                out.append((f"projects/{p.get('slug')}", img.replace("-full", "-thumb")))
    if (ROOT / "data/series.json").exists():
        for s in load_json("data/series.json") or []:
            for w in s.get("works") or []:
                if w.get("src"):
                    out.append((f"series/{s.get('slug')}", w["src"]))
                    out.append((f"series/{s.get('slug')}", w["src"].replace("-full", "-thumb")))
    if (ROOT / "data/home.json").exists():
        home = load_json("data/home.json") or {}
        hero = home.get("hero") or {}
        for img in [hero.get("image"), hero.get("image_mobile"), *(home.get("photos") or [])]:
            if img:
                out.append(("home", img))
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
    if re.search(r"^\s*@import", css, re.M):
        fail("[шрифты] styles.css: @import задерживает показ текста — шрифт подключается <link> в <head>")
    for html in sorted(ROOT.glob("*.html")):
        text = html.read_text(encoding="utf-8")
        if 'href="css/styles.css"' in text and "family=Onest" not in text:
            fail(f"[шрифты] {html.name}: не подключён Onest (<link> на fonts.googleapis.com в <head>)")
    root = re.search(r":root\s*\{([^}]*)\}", css)
    if not root or not re.search(r"--bg:\s*#FFFFFF\s*;", root.group(1), re.IGNORECASE):
        fail("[шрифты] styles.css: --bg в :root должен быть #FFFFFF")


# --- Проверка: меню и общая шапка -------------------------------------

MENU_ORDER = ["home", "studio", "about", "shop", "series", "projects", "info", "contacts"]
ABOUT_CHILDREN = ["cv", "statement"]


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


CV_PARTS_RE = re.compile(r"const CV_PARTS = \[([^\]]*)\]")
TEMPLATE_KEY_RE = re.compile(r"\bt\(`([^`]*)`\)")


def cv_parts_keys(text: str) -> set[str]:
    return {f"about.{part}" for m in CV_PARTS_RE.finditer(text) for part in re.findall(r"'(\w+)'", m.group(1))}


# Ключи-шаблоны вида t(`about.${key}`): чем раскрываются.
TEMPLATE_EXPANDERS = {"about.${key}": cv_parts_keys}


@functools.lru_cache(maxsize=None)
def used_i18n_keys() -> dict[str, frozenset[str]]:
    """Ключ i18n → файлы, где он используется (*.html, js/*.js, data/menu.json)."""
    used: dict[str, set[str]] = {}
    for path in [*sorted(ROOT.glob("*.html")), *sorted((ROOT / "js").glob("*.js"))]:
        text = path.read_text(encoding="utf-8")
        if path.suffix == ".js":  # примеры в комментариях — не использование ключей
            text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
        keys = set(I18N_KEY_RES[0].findall(text)) | set(I18N_KEY_RES[2].findall(text))
        for attr in I18N_KEY_RES[1].findall(text):
            keys |= {pair.split(":", 1)[1].strip() for pair in attr.split(",") if ":" in pair}
        for tpl in TEMPLATE_KEY_RE.findall(text):
            if tpl in TEMPLATE_EXPANDERS:
                keys |= TEMPLATE_EXPANDERS[tpl](text)
            else:
                fail(f"[i18n] {path.name}: шаблон ключа t(`{tpl}`) — добавить его в TEMPLATE_EXPANDERS")
        for key in keys:
            used.setdefault(key, set()).add(path.name)
    menu = load_json("data/menu.json")
    items = list(menu) if isinstance(menu, list) else []
    for m in list(items):
        items += m.get("children", [])
    for m in items:
        if m.get("i18n"):
            used.setdefault(m["i18n"], set()).add("menu.json")
    return {key: frozenset(files) for key, files in used.items()}


def check_i18n_keys_used_exist() -> None:
    global checks_run
    ru = load_json("i18n/ru.json")
    if ru is None:
        return
    checks_run += 1
    for key, files in sorted(used_i18n_keys().items()):
        if not i18n_has(ru, key):
            fail(f"[i18n] {', '.join(sorted(files))}: ключ '{key}' отсутствует в ru.json")


def check_i18n_keys_unused() -> None:
    global checks_run
    ru = load_json("i18n/ru.json")
    if ru is None:
        return
    checks_run += 1
    used = used_i18n_keys()
    for key in sorted(k for k in flatten_keys(ru) if i18n_has(ru, k)):
        if key not in used:
            fail(f"[i18n] ключ '{key}' нигде не используется — удалить из i18n/ru.json и en.json")


def check_titles() -> None:
    """Заголовок вкладки переводится: <title data-i18n="title.…">."""
    global checks_run
    checks_run += 1
    for html in sorted(ROOT.glob("*.html")):
        text = html.read_text(encoding="utf-8")
        if 'href="css/styles.css"' in text and '<title data-i18n="title.' not in text:
            fail(f"[заголовки] {html.name}: <title> без data-i18n=\"title.…\" — в EN останется русским")


def check_detail_canonical() -> None:
    """Серия и проект подставляют свой slug в canonical, hreflang и og:url."""
    global checks_run
    checks_run += 1
    if "setCanonicalParams(" not in (ROOT / "js/project.js").read_text(encoding="utf-8"):
        fail("[поисковики] js/project.js: не вызывается setCanonicalParams — все записи получат один адрес")


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
    path = ROOT / "js/project.js"
    if not path.exists() or "notFoundTitle" not in path.read_text(encoding="utf-8"):
        fail("[страницы] js/project.js: нет состояния «не найдено» для неизвестного slug")


def check_series_page() -> None:
    """Серии — ленты на series.html; series-view.html только переадресует старые ссылки."""
    global checks_run
    checks_run += 1
    if (ROOT / "js/series-view.js").exists():
        fail("[серии] js/series-view.js больше не нужен — серии показываются лентами на series.html")
    stub = ROOT / "series-view.html"
    text = stub.read_text(encoding="utf-8") if stub.exists() else ""
    if "location.replace" not in text or "series.html" not in text or 'href="css/styles.css"' in text:
        fail("[серии] series-view.html: должна быть только переадресация на series.html#<slug>")
    if "series-view.html" in (ROOT / "sitemap.xml").read_text(encoding="utf-8"):
        fail("[серии] sitemap.xml: series-view.html — переадресация, в карте сайта ей не место")


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


# --- Проверка: «Инфо» — пять документов раскрывающимся списком ---------

INFO_IDS = ["delivery", "returns", "privacy", "consent", "offer"]
INFO_EN_REQUIRED = ("delivery", "returns")  # юридические документы — только на русском
# Реквизиты и контакты сайтов, с которых взяты тексты, — не должны остаться.
INFO_FOREIGN = ("Замков", "Бекаревич", "Буглеев", "Янковск", "yankovskayart", "mankovsky",
                "mashayankovskaya", "bugleeva", "772378468917", "780108229300", "667902535516",
                "318774600334104", "325665800222720", "155 6568", "155-65-68", "723-03-59", "Почтой России",
                "Почта России", "Свердловск", "Екатеринбург", "YANKOVSK", "Маши")
INFO_MUST = {
    "delivery": ("СДЭК", "Самовывоз", "[@alinakhoniakart](https://t.me/alinakhoniakart)",
                 "+7 (960) 231-27-38"),
    "returns": ("7 дней", "10 рабочих дней", "индивидуальному заказу", "alinakhoniak@gmail.com"),
    "privacy": ("Хоняк Алин", "210403881900", "324210000076842", "Вурнары", "alinakhoniak@gmail.com"),
    "consent": ("Хоняк Алин", "210403881900", "324210000076842", "alinakhoniak@gmail.com", "(#privacy)"),
    "offer": ("Хоняк Алин", "Хоняк Алина Алексеевна", "210403881900", "324210000076842",
              "Чувашская Республика - Чувашия, Вурнарский район, поселок городского типа Вурнары",
              "+7 (911) 165-42-47", "alinakhoniak@gmail.com", "индивидуальному заказу",
              "31.10.2026", "(#privacy)"),
}


def check_info() -> None:
    global checks_run
    info = load_json("data/info.json")
    if info is None:
        fail("[инфо] data/info.json отсутствует")
        return
    checks_run += 1
    items = info if isinstance(info, list) else []
    ids = [x.get("id") for x in items]
    if ids != INFO_IDS:
        fail(f"[инфо] разделы {ids}, ожидались {INFO_IDS}")
    raw = (ROOT / "data/info.json").read_text(encoding="utf-8")
    for word in INFO_FOREIGN:
        if word in raw:
            fail(f"[инфо] info.json: осталось «{word}» — чужие реквизиты или контакты")
    for item in items:
        sid = item.get("id")
        title, body = item.get("title") or {}, item.get("body") or {}
        if not (title.get("ru") and title.get("en")):
            fail(f"[инфо] {sid}: нужен заголовок ru и en")
        ru = body.get("ru")
        if not (isinstance(ru, list) and ru and all(isinstance(x, str) and x for x in ru)):
            fail(f"[инфо] {sid}: body.ru — непустой список строк")
            continue
        if sid == "delivery" and "+7 (911)" in json.dumps(body, ensure_ascii=False):
            fail("[инфо] delivery: в доставке и оплате телефон +7 (960) 231-27-38, не +7 (911)")
        if sid in INFO_EN_REQUIRED and not body.get("en"):
            fail(f"[инфо] {sid}: нужен английский текст body.en")
        text = " ".join(ru)
        for must in INFO_MUST.get(sid, ()):
            if must not in text:
                fail(f"[инфо] {sid}: нет «{must}»")


# --- Проверка: «Об авторе» и подразделы ---------------------------------

ABOUT_SECTIONS = ("cv", "statement")
# Подразделы удалены 01.11.2026: их списки уже есть в CV на about.html.
REMOVED_PAGES = ("teaching.html", "curatorial.html", "publications.html")


OLD_PORTRAITS = ("assets/photos/artist-portrait.jpg", "assets/photos/alina-khoniak-portrait.jpg")

CV_COUNTS = {"education": 2, "teaching": 3, "exhibitions": 22, "curatorial": 1, "awards": 5, "publications": 9}


def jpeg_size(path: Path):
    """(ширина, высота) JPEG по маркеру SOF — без сторонних библиотек."""
    data = path.read_bytes()
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        length = int.from_bytes(data[i + 2:i + 4], "big")
        if marker in (0xC0, 0xC1, 0xC2):
            return int.from_bytes(data[i + 7:i + 9], "big"), int.from_bytes(data[i + 5:i + 7], "big")
        i += 2 + length
    return None


def check_about_sections() -> None:
    global checks_run
    checks_run += 1
    for name in ABOUT_SECTIONS:
        page = ROOT / f"{name}.html"
        if not page.exists():
            fail(f"[об авторе] {name}.html отсутствует")
        elif f'data-section="{name}"' not in page.read_text(encoding="utf-8"):
            fail(f"[об авторе] {name}.html: нет data-section=\"{name}\"")
    if (ROOT / "data/sections.json").exists():
        fail("[об авторе] data/sections.json больше не нужен — фото удалённых подразделов")
    sources = [*ROOT.glob("*.html"), *(ROOT / "js").glob("*.js"), *(ROOT / "data").glob("*.json"),
               ROOT / "sitemap.xml", ROOT / "README.md", ROOT / "docs/content-guide.html"]
    for name in REMOVED_PAGES:
        if (ROOT / name).exists():
            fail(f"[об авторе] {name} удалена — файла быть не должно")
        for src in sources:
            if src.is_file() and name in src.read_text(encoding="utf-8"):
                fail(f"[об авторе] {src.relative_to(ROOT).as_posix()}: ссылка на удалённую {name}")
    site = load_json("data/site.json") or {}
    check_bilingual(site.get("about_short"), "site.json.about_short")
    # полное CV по vigbo (u402663-2.web01.vigbo.ru/cv-1)
    cv = load_json("data/cv.json") or {}
    for key, count in CV_COUNTS.items():
        rows = cv.get(key) or []
        if len(rows) != count:
            fail(f"[об авторе] cv.json: в «{key}» {len(rows)} записей, ожидалось {count}")
        for row in rows:
            if not (row.get("period") and row.get("ru") and row.get("en")):
                fail(f"[об авторе] cv.json/{key}: у записи нужны period, ru и en — {row.get('ru', '')[:40]}")
    urls = [row["url"] for row in cv.get("publications") or [] if row.get("url")]
    if len(urls) != 7:
        fail(f"[об авторе] cv.json: у публикаций {len(urls)} ссылок, ожидалось 7")
    for url in urls:
        if not url.startswith(("https://", "http://")) or "turbopages" in url or "ysclid" in url:
            fail(f"[об авторе] cv.json: ссылка без Турбо-страниц и меток — {url}")
    # по старым адресам у браузеров в кэше лежат прежние фото — у нового свой адрес
    if site.get("portrait") in OLD_PORTRAITS:
        fail(f"[об авторе] портрет: адрес {site.get('portrait')} закэширован с прежним фото — нужен новый файл")
    portrait = ROOT / (site.get("portrait") or "")
    size = jpeg_size(portrait) if portrait.is_file() else None
    if not size or size[0] < 1200 or abs(size[0] / size[1] - 0.75) > 0.01:
        fail(f"[об авторе] портрет {site.get('portrait')}: нужно фото 3:4 шириной от 1200px, сейчас {size}")


# --- Проверка: контакты -----------------------------------------------

STUDIO_PHOTO = "assets/photos/studio-visit.jpg"
CONTACTS_RU = {
    "introTitle": "Связь с художником",
    "formIntro": "Либо воспользуйтесь формой обратной связи:",
}
STUDIO_IMAGES = ["assets/photos/studio-1-full.jpg", "assets/photos/studio-2-full.jpg"]
STUDIO_RU = {
    "visitTitle": "Мастерская",
    "visitText": "Посетите мастерскую Алины Хоняк в Санкт-Петербурге по предварительной записи, "
                 "чтобы познакомиться с сериями и увидеть понравившиеся вам произведения вживую.",
    "book": "Записаться на визит",
}


def check_contacts() -> None:
    """Контакты: блок «Связь с художником» с формой; мастерская — на studio.html."""
    global checks_run
    checks_run += 1
    html = (ROOT / "contacts.html").read_text(encoding="utf-8")
    if not re.search(r'class="(?:[^"]*\s)?contacts-intro(?:\s[^"]*)?"', html):
        fail("[контакты] contacts.html: нет блока .contacts-intro")
    if "studio-visit" in html or "contacts-studio" in html or STUDIO_PHOTO in html:
        fail("[контакты] contacts.html: блок мастерской переехал на studio.html")
    site = load_json("data/site.json") or {}
    if site.get("email") != "alinakhoniak@gmail.com":
        fail("[контакты] site.json: email должен быть alinakhoniak@gmail.com")
    if site.get("contact_telegram") != "https://t.me/alinakhoniakart":
        fail("[контакты] site.json: contact_telegram должен быть https://t.me/alinakhoniakart")
    ru = load_json("i18n/ru.json") or {}
    contacts = ru.get("contacts") or {}
    for key, want in CONTACTS_RU.items():
        if contacts.get(key) != want:
            fail(f"[контакты] i18n/ru.json: contacts.{key} должен быть «{want}»")
    for key in ("studioTitle", "studioText", "book", "photoAlt"):
        if key in contacts:
            fail(f"[контакты] i18n/ru.json: contacts.{key} переехал в блок studio")
    if 'class="contacts-muted contacts-form-intro"' not in html:
        fail("[контакты] contacts.html: нет фразы перед формой (.contacts-form-intro)")


def check_studio_visit() -> None:
    """Мастерская: блок «посетите мастерскую» — фото слева, текст и кнопка справа."""
    global checks_run
    checks_run += 1
    html = (ROOT / "studio.html").read_text(encoding="utf-8")
    for cls in ("studio-visit", "visit-photo", "visit-text", "visit-book"):
        if not re.search(rf'class="(?:[^"]*\s)?{cls}(?:\s[^"]*)?"', html):
            fail(f"[мастерская] studio.html: нет блока .{cls}")
    if f'src="{STUDIO_PHOTO}"' not in html:
        fail(f"[мастерская] studio.html: фото должно быть {STUDIO_PHOTO}")
    if not (ROOT / STUDIO_PHOTO).exists():
        fail(f"[мастерская] нет файла {STUDIO_PHOTO}")
    ru = load_json("i18n/ru.json") or {}
    studio = ru.get("studio") or {}
    for key, want in STUDIO_RU.items():
        if studio.get(key) != want:
            fail(f"[мастерская] i18n/ru.json: studio.{key} должен быть «{want}»")
    data = load_json("data/studio.json") or {}
    if data.get("images") != STUDIO_IMAGES:
        fail(f"[мастерская] studio.json: фото процесса должны быть {STUDIO_IMAGES}")
    for src in data.get("images") or []:
        for path in (src, src.replace("-full.jpg", "-thumb.jpg")):
            if not (ROOT / path).exists():
                fail(f"[мастерская] нет файла {path}")
    if any((data.get("text") or {}).get(lang) for lang in ("ru", "en")):
        fail("[мастерская] studio.json: текст-заглушка про будущие фото не нужен")
    site = load_json("data/site.json") or {}
    if (site.get("social") or {}).get("pinterest") != "https://pin.it/5FzbwuKWl":
        fail("[подвал] site.json: social.pinterest должен быть https://pin.it/5FzbwuKWl")
    # Instagram на сайте не показываем (решение от 01.11.2026)
    if "instagram" in (site.get("social") or {}) or "instagram" in (ROOT / "js/chrome.js").read_text(encoding="utf-8"):
        fail("[подвал] Instagram в подвале быть не должно — убрать из site.json → social и js/chrome.js")


# --- Проверка: форма связи (под блоком «Связь с художником») -----------

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
    if 'href="info.html#consent"' not in html:
        fail("[форма] contacts.html: ссылка у согласия должна вести на info.html#consent")


# --- main --------------------------------------------------------------

CHECKS = {
    "form": check_contact_form,
    "contacts": check_contacts,
    "studio": check_studio_visit,
    "info": check_info,
    "about": check_about_sections,
    "nocatalog": check_no_catalog_refs,
    "notfound": check_detail_pages_have_not_found,
    "series": check_series_page,
    "viewer": check_viewer,
    "menu": check_menu,
    "chrome": check_no_inline_chrome,
    "keys": check_i18n_keys_used_exist,
    "unused": check_i18n_keys_unused,
    "titles": check_titles,
    "canonical": check_detail_canonical,
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
