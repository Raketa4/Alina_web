# Сайт Алины Хоняк

Двуязычный (RU/EN) статический сайт-портфолио художницы в стиле jkim.ru:
белые страницы, шрифт Onest, меню-плитка из 8 квадратов поверх картины.
Без сборки — чистые HTML/CSS/JS.

**Адрес:** https://raketa4.github.io/Alina_web/
**Как обновлять контент (для заказчика):** [docs/content-guide.html](docs/content-guide.html)
**Дизайн-спека редизайна:** [docs/superpowers/specs/2026-10-25-redesign-menu-design.md](docs/superpowers/specs/2026-10-25-redesign-menu-design.md)
**Эталон меню:** [docs/superpowers/specs/2026-10-25-menu-mockup.html](docs/superpowers/specs/2026-10-25-menu-mockup.html)
**План редизайна:** [docs/superpowers/plans/2026-10-25-redesign-menu.md](docs/superpowers/plans/2026-10-25-redesign-menu.md)

## Структура

```
index.html                 главная
series.html                список серий         series-view.html?slug=  одна серия (только фото)
projects.html              список проектов      project.html?slug=      один проект (текст + фото)
studio.html                мастерская
about.html                 портрет и короткий рассказ
cv.html statement.html teaching.html curatorial.html publications.html — подразделы «Об авторе»
info.html contacts.html 404.html

css/styles.css    — вся вёрстка, палитра и типографика в :root
js/page.js        — bootPage(): шапка/меню/подвал → язык → интерфейс → страница → аналитика
js/chrome.js      — шапка, меню-плитка и подвал (вставляются в каждую страницу из data/menu.json)
js/viewer.js      — просмотрщик с зумом для всех [data-zoom] (листает в пределах data-gallery)
js/cards.js       — сетка обложек для серий и проектов
js/*.js           — модули страниц
data/*.json       — весь контент (правится без кода)
i18n/ru.json,en.json — словари интерфейса (наборы ключей обязаны совпадать)
assets/works/     — изображения работ: <id>-full.jpg (~1600px) и <id>-thumb.jpg (~800px)
assets/photos/    — портрет автора, фон меню (menu-bg.jpg)
scripts/          — check.py (проверки), make_placeholders.py, make_icons.py
```

## Где какой контент

| Раздел | Файл |
|---|---|
| Меню (8 квадратов, подразделы «Об авторе») | `data/menu.json` + блок `menu` в `i18n/*.json` |
| Главная | `data/home.json` |
| Серии и их работы | `data/series.json` |
| Проекты | `data/projects.json` |
| Мастерская | `data/studio.json` |
| Портрет, короткий рассказ, statement, почта, соцсети, `shop_url` | `data/site.json` |
| CV и тексты подразделов «Об авторе» | `data/cv.json` |
| Фото подразделов «Об авторе» | `data/sections.json` |
| Инфо (персональные данные, обмен и возврат) | `data/info.json` |

У работ в `series.json` есть название, год, техника и размер — на сайте они
не выводятся (только в `alt`), но сохраняются для будущего магазина.

## Магазин

Вписать адрес в `data/site.json` → `shop_url`. Квадрат «Магазин» станет
ссылкой (открывается в новой вкладке). Пустое поле — квадрат неактивен.

## Форма связи

`contacts.html` отправляет форму обычным POST на
`https://formsubmit.co/alinakhoniak@gmail.com` (адрес также подставляется
из `site.json` → `email`). После отправки FormSubmit возвращает на
`contacts.html?sent=1`. **При первой отправке FormSubmit присылает на почту
письмо активации — его нужно подтвердить один раз.**

## Проверка

```
python scripts/check.py            # все проверки
python scripts/check.py menu form  # только перечисленные
```
Проверяет: ключи словарей и их использование, схему данных, наличие всех
картинок, внутренние ссылки, шрифты, меню, форму, отсутствие каталога.

```
python scripts/browser_check.py
```
Браузерные проверки в фоновом Edge/Chrome (`tests/browser.html`): просмотрщик
не закрывается от клика по картинке, старые ссылки серий перенаправляются,
меню-плитка помещается без обрезки на 8 размерах экрана (от 360×640 до
1440×900, включая повёрнутый телефон).

## Локальный просмотр

```
python -m http.server 8000
```
Открыть http://localhost:8000/ (просто открыть файл через `file://` не
сработает — модули и `fetch` требуют http).

## Деплой

GitHub Pages из ветки `main`, папка `/` (root).

## Что осталось

- Настоящие фото работ и портрет (сейчас в `assets/works/` и
  `assets/photos/artist-portrait.jpg` — заглушки с названием).
- Тексты и фото для Мастерской, Преподавательской, Кураторской, Публикаций.
- Проверить черновики в `data/info.json` и `about_short` в `site.json`.
- Ссылка на магазин (`shop_url`).
- Утверждённый Алиной английский перевод.
- ID Яндекс.Метрики, верификация Google Search Console.
- При покупке домена — файл `CNAME` и замена адреса в `canonical`/`og:url`/
  `sitemap.xml`/`robots.txt`/`_next` формы/`<base>` в `404.html`.
