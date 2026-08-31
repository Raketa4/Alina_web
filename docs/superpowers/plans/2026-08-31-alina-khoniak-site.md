# План реализации: сайт Алины Хоняк

> **For agentic workers:** план исполняется задача за задачей. Шаги отмечаются чекбоксами (`- [ ]`).

**Goal:** Собрать двуязычный статический сайт-портфолио художницы с витриной-каталогом и заявками через `mailto`, готовый к деплою на GitHub Pages.

**Architecture:** Плоские HTML-файлы в корне репозитория, общий CSS, ванильный JS. Контент вынесен в JSON (`data/`), страницы рендерятся из него на клиенте. Двуязычность — словари `i18n/*.json` по атрибутам `data-i18n`, русский текст вписан в разметку по умолчанию. Без сборки и CI.

**Tech Stack:** HTML5, CSS (custom properties), ES-модули в браузере. Локальные скрипты — Python 3 (`scripts/check.py`, `scripts/make_placeholders.py`), т.к. Node.js на машине нет; Pillow для генерации плейсхолдеров.

**Spec:** `docs/specs/2026-08-31-alina-khoniak-site-design.md`

## Global Constraints

- Все ссылки на ресурсы — относительные (`assets/…`, `css/…`, `js/…`, `data/…`), без ведущего `/`.
- Никаких внешних зависимостей в рантайме, кроме шрифтов с `fonts.googleapis.com` / `fonts.gstatic.com`.
- Палитра: `--bg #F7F5F1`, `--ink #1E1B18`, `--accent #6E1E24`, `--canvas #B8A99A`, `--rule #E2DBD0`.
- Шрифты: заголовки Cormorant Garamond, текст EB Garamond, интерфейс Inter (uppercase + letter-spacing).
- Язык по умолчанию — русский; `<html lang="ru">` в исходнике.
- `prefers-reduced-motion` отключает анимации.
- Коммиты частые, по одной задаче; сообщения на английском, с `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## Структура файлов

```
index.html about.html projects.html project.html catalog.html info.html contacts.html 404.html
css/styles.css
js/util.js       — общие хелперы (qs, загрузка JSON, эскейп)
js/i18n.js       — словари, применение data-i18n, переключатель языка
js/ui.js         — мобильное меню, scroll-reveal, зум изображений; подключается всюду
js/home.js       — рендер избранных работ на главной
js/about.js      — рендер CV из data/cv.json
js/projects.js   — список серий на projects.html
js/project.js    — одна серия на project.html (?slug=)
js/catalog.js    — сетка работ, фильтры, кнопка mailto-заявки
js/contacts.js   — сборка формы в mailto
js/analytics.js  — Яндекс.Метрика по ID из site.json (пусто → no-op)
data/site.json data/projects.json data/catalog.json data/cv.json
i18n/ru.json i18n/en.json
assets/logo.svg assets/favicon.svg assets/favicon-32.png assets/apple-touch-icon.png
assets/photos/artist-portrait.jpg
assets/works/<slug>-full.jpg assets/works/<slug>-thumb.jpg
scripts/check.py scripts/make_placeholders.py
robots.txt sitemap.xml README.md
```

Шапка/футер — идентичная разметка в каждом HTML-файле.

---

## Задачи

### Task 1: Каркас проверок (TDD-основа)
- [ ] `scripts/check.py`: проверка 1 — совпадение ключей `i18n/ru.json` и `i18n/en.json` (глубокий обход, сравнение путей ключей).
- [ ] Проверка 2 — все файлы `data/*.json` парсятся и проходят минимальную схему (обязательные поля на элемент).
- [ ] Проверка 3 — каждый путь картинки из `data/*.json` существует на диске.
- [ ] Проверка 4 — каждый внутренний `href` в `*.html` (без `http`, `mailto:`, `#`) указывает на существующий файл.
- [ ] Запустить `python scripts/check.py` на пустых заглушках данных → убедиться, что проверки честно падают/проходят.
- [ ] Commit: `chore: add static-site consistency checks`.

### Task 2: Данные и словари
- [ ] `data/site.json` — контакты (плейсхолдеры), соцсети, `metrika_id: ""`, `gsc_verification: ""`.
- [ ] `data/cv.json` — образование, преподавание, выставки, награды, публикации (RU из брифа/Vigbo, EN — перевод). Данные из CV-страницы Vigbo.
- [ ] `data/projects.json` — 3 серии: `chuvash-wedding`, `mountains-and-sea`, `portraits` с описаниями {ru,en}.
- [ ] `data/catalog.json` — 12 работ серии «Горы и море» (названия, техника «Холст, масло», размеры, годы с Vigbo, `status:"available"`, `price` отсутствует), + 3 позиции `portraits` со статусом и пометкой уточнения.
- [ ] `i18n/ru.json` и `i18n/en.json` — ключи интерфейса (меню, кнопки, подписи, статусы, тексты info-страницы, футер).
- [ ] `python scripts/check.py` → проверки 1 и 2 проходят.
- [ ] Commit: `data: add site content, CV, projects and catalog`.

### Task 3: Плейсхолдеры изображений
- [ ] `scripts/make_placeholders.py`: читает `projects.json` + `catalog.json`, генерирует `-full`/`-thumb` как минимальные валидные JPЕG (или SVG→jpg) с подписью названия и правильным соотношением сторон; портрет `assets/photos/artist-portrait.jpg` (3:4).
- [ ] Запустить, проверить появление файлов в `assets/works/`.
- [ ] `python scripts/check.py` → проверка 3 проходит.
- [ ] Commit: `assets: generate artwork placeholders`.

### Task 4: Логотип и фавиконки
- [ ] `assets/logo.svg` — шрифтовой знак (текст «АЛИНА ХОНЯК», через `<text>` с Cormorant/serif fallback).
- [ ] `assets/favicon.svg` — монограмма «АХ».
- [ ] `assets/favicon-32.png`, `assets/apple-touch-icon.png` — из скрипта или простые растровые монограммы.
- [ ] Commit: `assets: add wordmark logo and favicons`.

### Task 5: CSS-система
- [ ] `css/styles.css`: `@import` шрифтов, `:root` переменные (палитра, типо-шкала, ритм), сброс, базовая типографика.
- [ ] Компоненты: фиксированная шапка, меню (десктоп + бургер), переключатель языка, футер, тонкие линейки, подписи-капс, сетки (works-grid, catalog-grid), карточка работы, кнопки, статус-бейдж.
- [ ] Утилиты `.reveal` (для scroll-reveal), `.hover-zoom`; блок `@media (prefers-reduced-motion: reduce)`.
- [ ] Адаптив: узкий контейнер, брейкпоинты; горизонтальный скролл запрещён.
- [ ] Commit: `style: add design system and components`.

### Task 6: Общий JS (util, i18n, ui, analytics)
- [ ] `js/util.js`: `getJSON(path)`, `qs/qsa`, `escapeHtml`, `getLang()`, `pick(obj)` (выбор ru/en).
- [ ] `js/i18n.js`: загрузка словаря, применение к `[data-i18n]` и `[data-i18n-attr]`, кнопка RU/EN, сохранение в `localStorage`, синхронизация `?lang=` и `<html lang>`.
- [ ] `js/ui.js`: бургер-меню, `IntersectionObserver` для `.reveal`, лёгкий зум по `.hover-zoom`/клику (lightbox по желанию — минимальный).
- [ ] `js/analytics.js`: если `site.json.metrika_id` не пуст — вставить сниппет Метрики; иначе ничего.
- [ ] Ручная проверка в браузере: переключение языка на статической странице-заглушке.
- [ ] Commit: `feat: add i18n, ui behaviours and analytics loader`.

### Task 7: Шаблон страницы + index.html
- [ ] Полный `<head>` (мета, OG/Twitter, canonical, favicon, шрифты, JSON-LD `WebSite`), шапка, футер — как эталон разметки.
- [ ] `index.html`: герой (портрет/картина + имя + интро), блок «Избранное» (контейнер под `js/home.js`), входы в разделы.
- [ ] `js/home.js`: берёт первые N работ с флагом `featured` (или первые из каталога), рендерит карточки-ссылки в каталог.
- [ ] `python scripts/check.py` → проверка 4 проходит для `index.html`.
- [ ] Commit: `feat: add page shell and home page`.

### Task 8: about.html
- [ ] Разметка: artist statement (RU в исходнике, EN в словаре/данных), портрет с подписью «Фото: Артём Жигалов», контейнер CV.
- [ ] `js/about.js`: рендер `cv.json` секциями с заголовками из i18n.
- [ ] JSON-LD `Person`/`VisualArtist`.
- [ ] Commit: `feat: add about page with CV`.

### Task 9: projects.html + project.html
- [ ] `projects.html` + `js/projects.js`: карточки серий (обложка, название, год, короткое описание) → ссылка `project.html?slug=…`.
- [ ] `project.html` + `js/project.js`: читает `?slug`, рендерит заголовок, описание, галерею работ серии; ссылка «Смотреть в каталоге» с фильтром; 404-состояние при неизвестном slug.
- [ ] Commit: `feat: add projects list and project detail`.

### Task 10: catalog.html
- [ ] Разметка: панель фильтров (проект, статус), сетка.
- [ ] `js/catalog.js`: рендер из `catalog.json`, фильтры (в URL `?project=&status=`), карточка (изображение, название, год, техника, размер, цена/«по запросу», бейдж статуса), кнопка «Оставить заявку» → `mailto:` с темой `Заявка: «<title>», <year>, <size>` и телом-шаблоном; для `sold` кнопка неактивна/«Продано».
- [ ] Клик по изображению — увеличение.
- [ ] Commit: `feat: add catalog with filters and inquiry`.

### Task 11: info.html + contacts.html + 404.html
- [ ] `info.html`: разделы «Как купить», «Доставка», «Оплата», «Оформление и подлинность», FAQ, «Приватность» — тексты в разметке (RU) + ключи EN.
- [ ] `contacts.html` + `js/contacts.js`: поля (имя, e-mail/телеграм, сообщение) → кнопка собирает `mailto:` с тA темой «Сообщение с сайта»; рядом прямые ссылки (e-mail, Telegram, соцсети из `site.json`).
- [ ] `404.html`: заглушка со ссылкой на главную (учесть подкаталог — относительная ссылка).
- [ ] Commit: `feat: add info, contacts and 404 pages`.

### Task 12: SEO-файлы и README
- [ ] `robots.txt` (allow, ссылка на sitemap), `sitemap.xml` (7 страниц + `project.html?slug=` для трёх серий).
- [ ] Пройтись по всем `<head>`: уникальные title/description, canonical на `raketa4.github.io/Alina_web/…`, `hreflang` ru/en.
- [ ] `README.md`: как добавить работу (JSON + 2 файла картинки), как обновить перевод, как править меню (во всех html), как прогнать `python scripts/check.py`, как задеплоить (GitHub Pages из `main`, папка root), план Фазы 2.
- [ ] `python scripts/check.py` → всё зелёное.
- [ ] Commit: `chore: add SEO files and project README`.

### Task 13: Финальная проверка и деплой-готовность
- [ ] Локальный просмотр через `python -m http.server` из корня: пройти все страницы, оба языка, фильтры, mailto, мобильную ширину.
- [ ] Прогнать `python scripts/check.py`.
- [ ] Включить GitHub Pages (Settings → Pages → main / root) — вручную пользователем; зафиксировать в README.
- [ ] Commit любых правок; предложить пользователю `git push`.

---

## Self-Review

- **Покрытие спеки:** 7 страниц + 404 (Task 7–11), i18n (Task 6), данные (Task 2), плейсхолдеры (Task 3), логотип/фавикон (Task 4), визуал (Task 5), SEO/аналитика (Task 6, 12), проверки (Task 1), README/Фаза 2 (Task 12). Приём заявок — Task 10 и 11. Все разделы спеки покрыты.
- **Плейсхолдеры в плане:** тексты контента берутся из брифа/Vigbo по ходу задач; английский — черновой перевод (допущение спеки). Схема `check.py` описана словами, код пишется в Task 1.
- **Согласованность имён:** `getJSON`, `getLang`, `pick`, `data-i18n`, slug'и (`chuvash-wedding`, `mountains-and-sea`, `portraits`), статусы (`available`/`reserved`/`sold`) — единые во всех задачах.
