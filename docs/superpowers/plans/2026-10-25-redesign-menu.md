# План реализации: редизайн — меню-плитка и новая структура

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переделать сайт под стиль jkim.ru: меню-плитка из 8 квадратов поверх картины, белые страницы на Onest, новая структура (Серии, Проекты, Мастерская, Об авторе + 5 подразделов, Инфо, Контакты с FormSubmit), без каталога и цен.

**Architecture:** Остаётся статический сайт: HTML + CSS + ванильные ES-модули, контент в `data/*.json`, двуязычие через `i18n/*.json`. Новое: шапка, меню-плитка и подвал больше не дублируются в каждом HTML — их вставляет `js/chrome.js` по описанию из `data/menu.json`. Каждая страница — тонкий HTML с `<main>` и вызовом `bootPage(init)`.

**Tech Stack:** HTML5, CSS custom properties, ES-модули в браузере; Google Fonts (Onest); FormSubmit для формы; Python 3 для `scripts/check.py` (Node.js на машине нет, Playwright не установлен).

**Spec:** `docs/superpowers/specs/2026-10-25-redesign-menu-design.md`
**Эталон меню:** `docs/superpowers/specs/2026-10-25-menu-mockup.html` (открывать через `python -m http.server` из корня репо)

## Global Constraints

- Работа только в ветке `redesign`; в `main` — одним слиянием в конце (Task 12).
- Пути относительные, без ведущего `/` (сайт живёт в `/Alina_web/`).
- Фон страниц `#FFFFFF`; шрифт **Onest** (Google Fonts, `subset` cyrillic + latin) — везде. Cormorant Garamond, EB Garamond, Inter — удалить. Шрифты jkim.ru (ABC Oracle, OT Alpha) не подключать.
- Цены, статусы `available/reserved/sold`, подписи под работами в сериях — нигде на сайте.
- Изображения-заглушки — только файлы из `assets/works/` и `assets/photos/`; ничего из интернета.
- Контент правится в `data/*.json` без правки кода; у каждой текстовой строки поля `ru` и `en` (EN может быть копией RU с пометкой).
- Ключи `i18n/ru.json` и `i18n/en.json` совпадают.
- `prefers-reduced-motion: reduce` отключает анимации меню и проявления.
- Строитель **не отправляет** реальных писем через форму.
- «Тест» в этом проекте = проверка в `scripts/check.py`. Каждая задача сначала добавляет проверку (она падает), потом реализует (проверка зелёная). Поведение в браузере — ручная проверка через `python -m http.server 8000`, шаги перечислены в задаче.
- Коммиты на английском (как в истории репо), с trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Низкий/узкий экран при открытом меню** (ноутбук 1366×650, телефон 360×640, поворот экрана) — все 8 квадратов видны без прокрутки на десктопе, на телефоне слой прокручивается; текст «Об авторе» с 5 подпунктами не вылезает за квадрат. → ручная проверка в Task 2, шаг 6.
2. **Клавиатура и Esc в меню и просмотрщике** — Tab не уходит под слой, Esc закрывает, фокус возвращается на бургер. → Task 2 шаг 6, Task 3 шаг 5.
3. **Неизвестный/пустой `?slug=`** на `series-view.html` и `project.html` — человек видит «не найдено» и ссылку назад, а не пустую страницу. → проверка `check_detail_pages_have_not_found` в Task 5.
4. **Переключение RU/EN на любой новой странице** — все подписи меню и заголовки переводятся, ключей-сырцов (`menu.studio`) на экране нет. → проверка `check_i18n_keys_used_exist` в Task 2.
5. **Пустой `shop_url`** — квадрат «Магазин» не ведёт на `#`/пустую страницу и не ломает сетку. → проверка в Task 2 (`shop_url` пустой → в `menu.json` у пункта `shop` нет `href`), ручная проверка шага 6.

---

## Структура файлов (итог)

```
index.html                 главная
series.html                список серий            js/series.js
series-view.html?slug=     одна серия (только фото) js/series-view.js
projects.html              список проектов         js/projects.js (переписать)
project.html?slug=         один проект             js/project.js (переписать)
studio.html                мастерская              js/studio.js
about.html                 портрет + короткий текст js/about.js (переписать)
cv.html statement.html teaching.html curatorial.html publications.html
                           подразделы «Об авторе»  js/about-section.js
info.html  contacts.html  404.html
js/chrome.js               шапка + меню-плитка + подвал (НОВЫЙ, из data/menu.json)
js/viewer.js               просмотрщик с зумом (НОВЫЙ, заменяет initLightbox в ui.js)
js/cards.js                общий рендер «список обложек» для серий и проектов (НОВЫЙ)
data/menu.json             8 пунктов меню (НОВЫЙ)
data/series.json           серии (НОВЫЙ; работы с метаданными из catalog.json)
data/projects.json         только проекты
data/home.json data/studio.json data/sections.json   (НОВЫЕ)
assets/photos/menu-bg.jpg  фон меню (уже в репо)
УДАЛИТЬ: catalog.html js/catalog.js data/catalog.json
```

---

### Task 1: Белый стиль и шрифт Onest

**Files:**
- Modify: `css/styles.css` (`:root`, разделы «сброс», «служебная типографика», «шапка», «hero», «фильтры», «блок разделы» — удалить ненужное)
- Modify: все `*.html` — `<link>` шрифтов
- Test: `scripts/check.py`

**Interfaces:**
- Produces: CSS-токены `--bg:#FFFFFF`, `--ink`, `--ink-soft`, `--rule`, `--font: 'Onest', 'Helvetica Neue', Arial, sans-serif`; классы `.container`, `.page-head`, `.prose`, `.rule`, `.reveal` сохраняются.

- [ ] **Step 1: Добавить в `check.py` функцию `check_fonts()`**
  - падает, если в `css/styles.css` или любом `*.html` встречается `Cormorant`, `EB Garamond`, `family=Inter`, `Oracle`, `Alpha_Book`;
  - падает, если в `css/styles.css` нет `family=Onest`;
  - падает, если в `:root` `--bg` не `#FFFFFF`. Вызвать из `main()`.
- [ ] **Step 2:** `python scripts/check.py` → FAIL с `[шрифты] … Cormorant`.
- [ ] **Step 3: Переписать токены и типографику** — Onest 400/500 через `@import` Google Fonts (`subset=cyrillic,latin`), один шрифт для заголовков и текста; заголовки — Onest 400, крупные, без засечек; убрать `--bg-sink`, `--accent*`, `--canvas`, `.section--sink`, стили фильтров и блока «разделы». Палитра: почти чёрный текст `#111`, серый `#6b6b6b`, линии `#E6E6E6`.
- [ ] **Step 4:** `python scripts/check.py` → проверка шрифтов проходит (остальные ошибки допустимы до своих задач — перечислить их в коммите нельзя, просто убедиться, что `[шрифты]` нет).
- [ ] **Step 5: Commit** `Switch to white background and Onest typeface`

---

### Task 2: Шапка, меню-плитка и подвал из `js/chrome.js`

**Files:**
- Create: `data/menu.json`, `js/chrome.js`
- Modify: `js/page.js` (вызвать `renderChrome()` до `initI18n` перевода), `js/ui.js` (удалить `initNav`), `css/styles.css` (новый раздел «меню-плитка», удалить старые `.site-nav`, `.nav-toggle`), `data/site.json` (+`shop_url: ""`, `email: "alinakhoniak@gmail.com"`), `i18n/ru.json`, `i18n/en.json` (+ блок `menu`)
- Modify: все `*.html` — удалить `<header class="site-header">…</header>` и `<footer>…</footer>`; в `<body>` остаётся только `<main id="main">…</main>` и скрипт
- Test: `scripts/check.py`

**Interfaces:**
- `data/menu.json` — массив ровно из 8 объектов `{ "id", "i18n", "href"?, "children"? }` в порядке:
  `home→index.html`, `studio→studio.html`, `about→about.html` (children: `cv→cv.html`, `statement→statement.html`, `teaching→teaching.html`, `curatorial→curatorial.html`, `publications→publications.html`), `shop` (без `href`; берётся из `site.shop_url`), `series→series.html`, `info→info.html`, `projects→projects.html`, `contacts→contacts.html`. Поле `i18n` = `menu.<id>`.
- `js/chrome.js`: `export async function renderChrome(): Promise<void>` — вставляет в начало `<body>` `<header class="site-header">` (логотип `site.name` заглавными через CSS, переключатель `.lang-switch` с кнопками `data-lang="ru|en"`, кнопка `.menu-toggle` с тремя `<span>` и `aria-expanded`, `aria-controls="site-menu"`), слой `<div class="menu-layer" id="site-menu" hidden>` с `<nav class="menu-grid">` из 8 `.menu-cell`, и в конец `<footer class="site-footer">` (© год, ссылки `[data-site-link=telegram|instagram|vk]`). Тексты — через `data-i18n`, поэтому `renderChrome()` вызывается **до** `applyTranslations`.
- Пункт `shop`: если `site.shop_url` пуст — `<div class="menu-cell is-disabled" aria-disabled="true">`, иначе `<a href=shop_url target="_blank" rel="noopener">`.
- Текущая страница: у ссылки, чей `href` совпадает с `location.pathname`, `aria-current="page"`.

- [ ] **Step 1: Добавить в `check.py`:**
  - `check_menu()`: `data/menu.json` — список длины 8, `[m["id"] for m in menu] == ["home","studio","about","shop","series","info","projects","contacts"]`; children у `about` == `["cv","statement","teaching","curatorial","publications"]`; у `shop` нет `href`; каждый `href` существует на диске (до появления страниц — проверка падает, это ожидаемо и закрывается задачами 5–11); каждый `i18n` есть в `i18n/ru.json`.
  - `check_no_inline_chrome()`: ни один `*.html` не содержит `class="site-header"`, `class="site-nav"`, `class="site-footer"`.
  - `check_i18n_keys_used_exist()`: каждое значение `data-i18n="…"` и `data-i18n-attr` в `*.html` и `js/*.js` (regex `data-i18n="([\w.]+)"` и `t\('([\w.]+)'\)`) существует в `i18n/ru.json`.
- [ ] **Step 2:** `python scripts/check.py` → FAIL: `[меню] data/menu.json отсутствует`, `[разметка] index.html содержит site-header`.
- [ ] **Step 3: Реализовать `data/menu.json`, `js/chrome.js`, i18n-ключи `menu.*`** (RU: «Алина Хоняк», «Мастерская», «Об авторе», «CV», «Artist statement», «Преподавательская деятельность», «Кураторская практика», «Публикации», «Магазин», «Серии», «Инфо», «Проекты», «Контакты»; EN: Alina Khoniak, Studio, About, CV, Artist statement, Teaching, Curatorial practice, Publications, Shop, Series, Info, Projects, Contacts). Поведение меню (открыть/закрыть, Esc, ловушка фокуса, блок прокрутки `body` через класс `menu-open`, возврат фокуса на бургер, закрытие при клике по ссылке) — в том же модуле.
- [ ] **Step 4: CSS меню — перенести из эталона** `docs/superpowers/specs/2026-10-25-menu-mockup.html` с точными значениями:
  - бургер 32×24, полоски `height:2px`, `top: 3px / 11px / 19px`; открыто → 1-я и 3-я в `top:11px` с `rotate(±45deg)`, 2-я `opacity:0`;
  - слой: `position:fixed; inset:0; padding:76px 28px 28px; background:#5f9fb8 url('../assets/photos/menu-bg.jpg') center/cover no-repeat`, появление `opacity .45s`;
  - шапка при `body.menu-open` — без белого фона (прозрачная над картиной);
  - `.menu-grid { --side: min(calc((100vh - 134px) / 4), calc((100vw - 66px) / 2)); grid-template-columns: repeat(2, var(--side)); grid-auto-rows: var(--side); justify-content:center; padding:2px 0 0 2px }`;
  - `.menu-cell { background:#fff; border:2px solid transparent; background-clip:padding-box; margin:-2px 0 0 -2px; padding:8% 18px 16px; display:flex; flex-direction:column; align-items:center; text-align:center }`, hover `#f6f3ee`; появление по очереди `translateY(12px)→0`, задержка `0.05s × (n)`;
  - заголовок `font-size: clamp(16px, calc(var(--side) * .09), 32px)`; подпункты `clamp(11px, calc(var(--side) * .055), 17px)`, `line-height:1.6`, `margin-top:12px`; у `home` заголовок `text-transform:uppercase; letter-spacing:.06em`;
  - `@media (max-width:800px)`: `--side: calc((100vw - 42px) / 2)`, слой `overflow:auto`, `padding:68px 16px 16px`.
- [ ] **Step 5:** удалить шапку/подвал из всех `*.html`; `python scripts/check.py` → `[меню]`-ошибки остаются только «файл не найден» для ещё не созданных страниц; `[разметка]` и `[i18n]` — без ошибок.
- [ ] **Step 6: Ручная проверка** (`python -m http.server 8000`, открыть `http://localhost:8000/`): сравнить с эталоном рядом; при 1440×900, 1366×650 все 8 квадратов видны без прокрутки; при 360×640 — 2 в ряд, слой скроллится; список «Об авторе» помещается в квадрат при 1366×650; Tab ходит только внутри меню, Esc закрывает и возвращает фокус на бургер; «Магазин» не кликабелен; RU→EN переводит все подписи.
- [ ] **Step 7: Commit** `Add tile menu and shared header/footer rendered from data/menu.json`

---

### Task 3: Просмотрщик с зумом

**Files:**
- Create: `js/viewer.js`
- Modify: `js/ui.js` (удалить `initLightbox`, вызвать `initViewer()`), `css/styles.css` (раздел `lightbox` → `viewer`)
- Test: `scripts/check.py`

**Interfaces:**
- Produces: разметка-триггер `<button type="button" data-zoom="<full src>" data-gallery="<id>">` с `<img>` внутри. `export function initViewer(): void` — делегированный клик по `[data-zoom]`; листание идёт по всем `[data-zoom]` с тем же `data-gallery` в порядке DOM.
- Поведение: полноэкранный белый слой; кнопки «закрыть» (✕), «←», «→» (`aria-label` из `i18n: common.close / common.prev / common.next`); зум — колесо мыши (1×…4×, к точке курсора), двойной клик/тап (1× ↔ 2.5×), щипок двумя пальцами (Pointer Events); перетаскивание при зуме > 1; свайп влево/вправо при зуме = 1 листает; Esc / клик по фону при 1× закрывает; ←/→ на клавиатуре листают; при закрытии фокус возвращается на триггер. Никаких подписей к изображению.

- [ ] **Step 1:** в `check.py` `check_viewer()`: `js/ui.js` не содержит `initLightbox`; `js/viewer.js` существует и экспортирует `initViewer`; ключи `common.prev`, `common.next` есть в `i18n/ru.json`.
- [ ] **Step 2:** `python scripts/check.py` → FAIL `[просмотрщик]`.
- [ ] **Step 3:** реализовать `js/viewer.js` (без внешних библиотек; состояние `{ scale, x, y }`, `transform: translate(x,y) scale(scale)` на `<img>`; ограничивать сдвиг краями изображения).
- [ ] **Step 4:** `python scripts/check.py` → `[просмотрщик]` нет.
- [ ] **Step 5: Ручная проверка** на временной странице (или после Task 5 на `series-view.html`): зум колесом и двойным кликом, перетаскивание, листание стрелками, Esc; в DevTools в режиме устройства — щипок (Shift+drag) и свайп.
- [ ] **Step 6: Commit** `Replace lightbox with zoomable gallery viewer`

---

### Task 4: Перенос данных: серии, проекты, удаление каталога

**Files:**
- Create: `data/series.json`
- Modify: `data/projects.json`, `scripts/check.py`
- Delete: `data/catalog.json`

**Interfaces:**
- `data/series.json` — список `{ slug, title{ru,en}, summary{ru,en}, cover, works:[{ id, src, title{ru,en}, year, medium{ru,en}, size }] }`. Серии: `mountains-and-sea` (работы `mas-01…mas-12` из catalog.json в его порядке), `portraits` (`por-01…por-03`). Поле `status` и `price` не переносить. `summary` — первое предложение нынешнего `description`.
- `data/projects.json` — список `{ slug, title, summary, year, text{ru:[абзацы],en:[абзацы]}, cover, images:[src] }`; одна запись `chuvash-wedding` (`text` = нынешний `description` одним абзацем).

- [ ] **Step 1:** в `check.py` заменить проверки `catalog.json`/`projects.json` на:
  - `series.json`: непустой список, уникальные `slug`, обязательные `slug,title,summary,cover,works`; у каждой работы `id,src,title`; ни у одной работы нет ключей `status`/`price`; слаги == `{"mountains-and-sea","portraits"}`.
  - `projects.json`: обязательные `slug,title,summary,text,cover,images`; слаги == `{"chuvash-wedding"}`.
  - `data/catalog.json` не существует.
  - `collect_image_paths()` берёт `series[].cover`, `series[].works[].src`, `projects[].cover/images`.
- [ ] **Step 2:** `python scripts/check.py` → FAIL `[схема] series.json отсутствует`.
- [ ] **Step 3:** одноразовым Python-скриптом (не коммитить) собрать `series.json` из `catalog.json` + `projects.json`, переписать `projects.json`, удалить `catalog.json`.
- [ ] **Step 4:** `python scripts/check.py` → ошибок `[схема]` и `[изображение]` нет.
- [ ] **Step 5: Commit** `Split data into series and projects; drop catalog prices and statuses`

---

### Task 5: Страницы серий

**Files:**
- Create: `series.html`, `series-view.html`, `js/cards.js`, `js/series.js`, `js/series-view.js`
- Modify: `css/styles.css` (раздел «обложки» и «галерея серии»), `i18n/*.json` (+`series.title`, `series.notFoundTitle`, `series.notFoundText`, `series.back`)
- Test: `scripts/check.py`

**Interfaces:**
- `js/cards.js`: `export function renderCards(items: Array<{href, cover, title, summary}>): string` — сетка `.cards` (3 колонки ≥1000px, 2 — ≥600px, 1 — меньше); карточка: обложка `thumbImg`, под ней название и `summary`. Используется также в Task 6.
- `js/series.js`: `export async function initSeries()` — монтирует `renderCards` в `#series-list`, `href = series-view.html?slug=<slug>`.
- `js/series-view.js`: `export async function initSeriesView()` — в `#series-view` заголовок серии + сетка кнопок `data-zoom=<work.src> data-gallery="series"` с `thumbImg(src, alt)`, где `alt` = `title, year` (только для `alt`, не текстом на странице). Нет `slug`/неизвестный → блок «не найдено» + ссылка «← Серии».

- [ ] **Step 1:** в `check.py`:
  - `check_detail_pages_have_not_found()`: `js/series-view.js` и `js/project.js` содержат ключ `notFoundTitle`.
  - `check_no_captions_in_series()`: `js/series-view.js` не содержит `work-meta`, `work-title`, `medium`, `size`, `price`, `status` (кроме внутри построения `alt` — проверять, что `medium|size` не встречаются вовсе).
- [ ] **Step 2:** `python scripts/check.py` → FAIL.
- [ ] **Step 3:** реализовать страницы и модули.
- [ ] **Step 4:** `python scripts/check.py` → новые проверки и `[меню] series.html` зелёные.
- [ ] **Step 5: Ручная проверка:** `series.html` — 2 обложки с названием и описанием; клик → `series-view.html?slug=mountains-and-sea`, 12 работ без подписей; клик по работе → просмотрщик листает все 12; `?slug=xxx` и без `slug` → «не найдено».
- [ ] **Step 6: Commit** `Add series list and series view pages`

---

### Task 6: Страницы проектов

**Files:**
- Modify: `projects.html`, `project.html`, `js/projects.js`, `js/project.js`, `i18n/*.json` (убрать `project.seeInCatalog`, `project.worksTitle`, `projects.view`)

**Interfaces:**
- Consumes: `renderCards` из `js/cards.js`; `data/projects.json` (Task 4).
- `project.html?slug=` — заголовок, абзацы `text`, фото `images` (кнопки `data-zoom`, `data-gallery="project"`); без мета-строки «роль · год», без ссылки в каталог. Неизвестный slug → «не найдено».

- [ ] **Step 1:** в `check.py` `check_no_catalog_refs()`: ни один `*.html`, `js/*.js`, `i18n/*.json` не содержит `catalog` (подстроку).
- [ ] **Step 2:** `python scripts/check.py` → FAIL (проекты, главная, i18n ссылаются на каталог).
- [ ] **Step 3:** переписать `js/projects.js` через `renderCards`, `js/project.js` — по описанию выше; убрать ключи каталога из i18n.
- [ ] **Step 4:** `python scripts/check.py` → `catalog`-ссылки остаются только в файлах задач 7 и 12 (index.html, catalog.html, js/catalog.js, js/home.js, README, content-guide) — допустимо до их задач.
- [ ] **Step 5: Ручная проверка:** список с одной обложкой «Чувашская свадьба»; страница проекта — текст и 3 фото, просмотрщик работает.
- [ ] **Step 6: Commit** `Rework projects pages: cover cards and photo+text project view`

---

### Task 7: Главная

**Files:**
- Create: `data/home.json`
- Modify: `index.html`, `js/home.js`, `css/styles.css` (раздел hero)

**Interfaces:**
- `data/home.json`: `{ hero: { image, text{ru,en} }, photos: [src], text{ru:[абзацы],en:[абзацы]} }`. Заглушки: `hero.image = assets/works/chuvash-wedding-full.jpg`, `hero.text` = `site.intro`; `photos` = `chuvash-wedding-detail-1-full.jpg`, `chuvash-wedding-detail-2-full.jpg`, `mas-04-full.jpg`, `por-01-full.jpg`; `text` = первый абзац `site.statement`.
- Главная: фото «Чувашской свадьбы» на всю ширину контейнера, текст под ним; ниже сетка `photos` (`data-zoom`, `data-gallery="home"`) и абзацы `text`. Без кнопок и блока «разделы».
- `site.json`: удалить `featured`.

- [ ] **Step 1:** в `check.py`: `home.json` — обязательные `hero.image`, `hero.text`, `photos`, `text`; пути изображений проверяются в `collect_image_paths()`; `site.json` не содержит `featured`.
- [ ] **Step 2:** `python scripts/check.py` → FAIL `[схема] home.json`.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `python scripts/check.py` → нет ошибок по главной и `catalog` в `index.html`/`js/home.js`.
- [ ] **Step 5: Commit** `Rebuild home page around The Chuvash Wedding`

---

### Task 8: Об авторе и пять подразделов

**Files:**
- Create: `cv.html`, `statement.html`, `teaching.html`, `curatorial.html`, `publications.html`, `js/about-section.js`, `data/sections.json`
- Modify: `about.html`, `js/about.js`, `data/site.json` (+`about_short{ru,en}`), `i18n/*.json`

**Interfaces:**
- `about.html`: портрет `site.portrait` + подпись `portrait_credit` + `site.about_short` (заглушка: первые два предложения первого абзаца `statement`); ниже — ссылки на 5 подразделов.
- Каждая из 5 страниц: `<main id="main" data-section="cv|statement|teaching|curatorial|publications">`, `bootPage(initAboutSection)`.
- `js/about-section.js`: `export async function initAboutSection()`:
  - `cv` — разделы `education, exhibitions, awards` из `cv.json` (как нынешний рендер CV);
  - `statement` — абзацы `site.statement`;
  - `teaching | curatorial | publications` — список `cv.json[section]` + сетка фото `sections.json[section].images` (`data-zoom`, `data-gallery=section`).
- `data/sections.json`: `{ teaching:{images:[…]}, curatorial:{images:[…]}, publications:{images:[…]} }`, заглушки — по 2 файла из `assets/works/` (разные для каждого раздела).

- [ ] **Step 1:** в `check.py`: 5 файлов существуют и каждый содержит `data-section="<имя файла>"`; `sections.json` имеет 3 ключа с непустыми `images`; `site.json.about_short` двуязычный.
- [ ] **Step 2:** `python scripts/check.py` → FAIL.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `python scripts/check.py` → `[меню]` по подпунктам «Об авторе» зелёные.
- [ ] **Step 5: Ручная проверка:** все 5 ссылок из квадрата «Об авторе» открывают свои страницы; RU/EN.
- [ ] **Step 6: Commit** `Add About page with five subsections`

---

### Task 9: Мастерская

**Files:**
- Create: `studio.html`, `js/studio.js`, `data/studio.json`

**Interfaces:**
- `data/studio.json`: `{ text{ru:[абзацы],en:[абзацы]}, images:[src] }`; заглушка текста — «Здесь появятся фотографии процесса работы в мастерской.» / EN-перевод; `images` — 4 файла из `assets/works/`.
- Страница: заголовок «Мастерская», общий текст, сетка фото (`data-gallery="studio"`).

- [ ] **Step 1:** `check.py`: `studio.json` — непустые `text`, `images`; пути в `collect_image_paths()`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** `python scripts/check.py` — `[меню] studio.html` зелёный.
- [ ] **Step 5: Commit** `Add studio page`

---

### Task 10: Инфо

**Files:**
- Modify: `data/info.json`, `info.html`

**Interfaces:**
- `info.json` — ровно 2 раздела в порядке `privacy`, `returns`.
  - `privacy` — черновик: какие данные собирает форма (имя, e-mail, текст сообщения), зачем (ответ на обращение), что передаются через сервис FormSubmit (formsubmit.co) на почту художника, не передаются третьим лицам для других целей, как отозвать согласие (письмом на alinakhoniak@gmail.com). Первый абзац: «Черновик — требует проверки автором.»
  - `returns` — «Обмен и возврат»: «Раздел появится вместе с магазином. Черновик — требует проверки автором.»

- [ ] **Step 1:** `check.py`: `[s["id"] for s in info] == ["privacy","returns"]`; текст `privacy.body.ru` содержит `FormSubmit`.
- [ ] **Step 2:** FAIL. **Step 3:** переписать. **Step 4:** PASS.
- [ ] **Step 5: Commit** `Rewrite Info: privacy for FormSubmit, returns placeholder`

---

### Task 11: Контакты и форма FormSubmit

**Files:**
- Modify: `contacts.html`, `js/contacts.js`, `i18n/*.json`

**Interfaces:**
- Форма: `<form id="contact-form" method="POST" action="https://formsubmit.co/alinakhoniak@gmail.com">`; поля `name` (required), `email` (type=email, required), `message` (required), чекбокс `consent` (required) со ссылкой `info.html#privacy`; скрытые `_subject` («Сообщение с сайта alinakhoniak»), `_template=table`, `_captcha=false`, `_next=https://raketa4.github.io/Alina_web/contacts.html?sent=1`, ловушка `_honey` (скрытое текстовое поле).
- `js/contacts.js`: переставляет `action` на `https://formsubmit.co/${site.email}`, если `site.email` задан; при `?sent=1` показывает «Спасибо, сообщение отправлено»; блок ссылок: почта (`mailto`), Telegram, Instagram, VK. Логику `mailto`-сборки удалить.

- [ ] **Step 1:** `check.py` `check_contact_form()`: в `contacts.html` есть `action="https://formsubmit.co/alinakhoniak@gmail.com"`, `name="email"`, `name="consent"`, `name="_next"` со значением на `contacts.html?sent=1`; `site.json.email == "alinakhoniak@gmail.com"`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** PASS.
- [ ] **Step 5: Ручная проверка без отправки:** пустая форма не уходит (браузерная валидация), без галочки не уходит; `contacts.html?sent=1` показывает благодарность. **Не нажимать «Отправить» с заполненной формой.**
- [ ] **Step 6: Commit** `Contact form via FormSubmit with consent`

---

### Task 12: Уборка, документация, слияние

**Files:**
- Delete: `catalog.html`, `js/catalog.js`
- Modify: `404.html`, `sitemap.xml`, `README.md`, `docs/content-guide.html`, `scripts/make_placeholders.py` (если читает `catalog.json` — перевести на `series.json`)

- [ ] **Step 1:** `sitemap.xml` — все новые страницы (`index, series, projects, project?slug=chuvash-wedding, series-view?slug=…` ×2, `studio, about, cv, statement, teaching, curatorial, publications, info, contacts`), без `catalog`.
- [ ] **Step 2:** README и `content-guide.html` — новая структура, какие JSON править для каждого раздела, как вписать `shop_url`, что FormSubmit требует один раз подтвердить почту.
- [ ] **Step 3:** `python scripts/check.py` → `OK — все проверки пройдены`.
- [ ] **Step 4: Финальный ручной обход** всех 8 пунктов меню и 5 подпунктов в RU и EN на 1440×900 и 360×640; консоль браузера без ошибок.
- [ ] **Step 5: Commit** `Remove catalog, update sitemap and docs for redesign`
- [ ] **Step 6:** показать заказчику; после его «ок» — `git checkout main && git merge --no-ff redesign && git push`. Напомнить заказчику проверить форму после публикации.
