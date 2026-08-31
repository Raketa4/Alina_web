# Сайт Алины Хоняк

Двуязычный (RU/EN) статический сайт-портфолио художницы: главная, об авторе,
проекты, каталог, инфо, контакты. Без сборки — чистые HTML/CSS/JS.

**Адрес:** https://raketa4.github.io/Alina_web/
**Как обновлять контент (для заказчика):** [docs/content-guide.html](docs/content-guide.html)
**Дизайн-спека:** [docs/specs/2026-08-31-alina-khoniak-site-design.md](docs/specs/2026-08-31-alina-khoniak-site-design.md)
**План работ:** [docs/superpowers/plans/2026-08-31-alina-khoniak-site.md](docs/superpowers/plans/2026-08-31-alina-khoniak-site.md)

## Структура

```
*.html            — страницы (шапка и футер продублированы в каждой)
css/styles.css    — вся вёрстка, палитра и типографика в :root
js/               — ES-модули; каждая страница вызывает bootPage() из page.js
data/*.json       — весь контент (правится без кода)
i18n/ru.json,en.json — словари интерфейса (наборы ключей обязаны совпадать)
assets/works/     — изображения работ: <id>-full.jpg (~1600px) и <id>-thumb.jpg (~800px)
assets/photos/    — портрет автора
scripts/          — вспомогательные скрипты на Python
```

## Как обновлять контент (Фаза 2)

### Добавить/изменить работу в каталоге
1. Открыть `data/catalog.json`, добавить объект:
   ```json
   {
     "id": "mas-13",
     "title": { "ru": "Название", "en": "Title" },
     "year": "2025",
     "medium": { "ru": "Холст, масло", "en": "Oil on canvas" },
     "size": "50 × 70 см",
     "status": "available",        // available | reserved | sold
     "project": "mountains-and-sea",
     "image": "assets/works/mas-13-full.jpg",
     "price": "180 000 ₽"           // необязательно; нет поля → «Цена по запросу»
   }
   ```
2. Положить файлы `assets/works/mas-13-full.jpg` и `assets/works/mas-13-thumb.jpg`
   (большая сторона ≈ 1600 и 800 px соответственно).
3. Прогнать `python scripts/check.py` — не должно быть ошибок.

### Заменить плейсхолдеры настоящими фото работ
Просто перезаписать файлы в `assets/works/` тем же именем. Скрипт
`python scripts/make_placeholders.py` создаёт недостающие плейсхолдеры и
**не трогает** уже существующие файлы (пересоздать все — флаг `--force`).

### Обновить проект/серию
`data/projects.json` — поля `title`, `description`, `year`, `role`,
`cover`, `images[]`. `slug` менять нельзя (он в ссылках и sitemap).

### CV, artist statement, тексты «Инфо»
`data/cv.json`, поле `statement` в `data/site.json`, `data/info.json`.

### Контакты, соцсети, аналитика
`data/site.json`:
- `email` — как только появится, заработают кнопки «Оставить заявку» (mailto).
  Пока пусто — заявки уходят в Telegram.
- `social.telegram` / `instagram` / `vk` — ссылки.
- `metrika_id` — вписать номер счётчика Яндекс.Метрики, и она подключится сама.
- `gsc_verification` — при верификации Google Search Console положить HTML-файл
  подтверждения в корень репозитория (см. как в проекте raketa4.github.io).
  ⚠️ Скачанные файлы подтверждения бывают заражены тегами kaspersky-labs.com —
  проверить и вычистить перед коммитом.

### Перевод (EN)
`i18n/en.json` — интерфейс; `data/*.json` — длинные тексты (поле `en`).
Наборы ключей `ru.json` и `en.json` должны совпадать — это проверяет `check.py`.

### Меню
Навигация продублирована в каждом `*.html`. При изменении пунктов
править во всех файлах.

## Проверка

```
python scripts/check.py
```
Проверяет: совпадение ключей словарей, схему данных, наличие всех
картинок, отсутствие битых внутренних ссылок.

## Локальный просмотр

```
python -m http.server 8000
```
Открыть http://localhost:8000/ (просто открыть файл через `file://` не
сработает — модули и `fetch` требуют http).

## Деплой

GitHub Pages из ветки `main`, папка `/` (root).
Settings → Pages → Source: Deploy from a branch → main → /(root).

## Что осталось (Фаза 2)

- Настоящие изображения работ и портрет.
- E-mail для заявок, телефон, точные ссылки соцсетей.
- Утверждённый Алиной английский перевод.
- ID Яндекс.Метрики, верификация Google Search Console.
- Детали работ серии «Портреты» (сейчас только в проекте, не в каталоге).
- При покупке домена — файл `CNAME` в корне и обновление `canonical`/`og:url`/
  `sitemap.xml`/`robots.txt` на новый адрес.
