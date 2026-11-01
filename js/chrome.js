// Общая «обвязка» каждой страницы: шапка, меню и подвал.
// Пункты меню — data/menu.json, ссылки соцсетей и магазина — data/site.json.
// Вызывается до applyTranslations: подписи проставляются через data-i18n.

import { getJSON, qs, qsa, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';

const SOCIAL = ['telegram', 'vk', 'pinterest'];
const LABELS = { telegram: 'Telegram', vk: 'VK', pinterest: 'Pinterest' };
// Значки соцсетей — Simple Icons (CC0). У Telegram и Pinterest логотип — круг,
// внутри кружка оставлен только самолётик и буква P; viewBox — по центру знака.
const ICONS = {
  telegram: ['3.552 5.124 15 15', 'M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'],
  vk: ['0 0 24 24', 'm9.489.004.729-.003h3.564l.73.003.914.01.433.007.418.011.403.014.388.016.374.021.36.025.345.03.333.033c1.74.196 2.933.616 3.833 1.516.9.9 1.32 2.092 1.516 3.833l.034.333.029.346.025.36.02.373.025.588.012.41.013.644.009.915.004.98-.001 3.313-.003.73-.01.914-.007.433-.011.418-.014.403-.016.388-.021.374-.025.36-.03.345-.033.333c-.196 1.74-.616 2.933-1.516 3.833-.9.9-2.092 1.32-3.833 1.516l-.333.034-.346.029-.36.025-.373.02-.588.025-.41.012-.644.013-.915.009-.98.004-3.313-.001-.73-.003-.914-.01-.433-.007-.418-.011-.403-.014-.388-.016-.374-.021-.36-.025-.345-.03-.333-.033c-1.74-.196-2.933-.616-3.833-1.516-.9-.9-1.32-2.092-1.516-3.833l-.034-.333-.029-.346-.025-.36-.02-.373-.025-.588-.012-.41-.013-.644-.009-.915-.004-.98.001-3.313.003-.73.01-.914.007-.433.011-.418.014-.403.016-.388.021-.374.025-.36.03-.345.033-.333c.196-1.74.616-2.933 1.516-3.833.9-.9 2.092-1.32 3.833-1.516l.333-.034.346-.029.36-.025.373-.02.588-.025.41-.012.644-.013.915-.009ZM6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z'],
  pinterest: ['2.017 3.965 20 20', 'M7.647 23.149c-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146z'],
};

export async function renderChrome() {
  const [menu, site] = await Promise.all([
    getJSON('data/menu.json').catch(() => []),
    getSite(),
  ]);

  document.body.insertAdjacentHTML('afterbegin', headerHtml() + menuHtml(menu, site));
  document.body.insertAdjacentHTML('beforeend', footerHtml(site));
  markCurrent();
  wireMenu();
}

function headerHtml() {
  return `
    <header class="site-header">
      <a class="wordmark" href="index.html" data-i18n="menu.home">Алина Хоняк</a>
      <div class="header-tools">
        <div class="lang-switch" role="group" data-i18n-attr="aria-label:lang.switch">
          <button type="button" data-lang="ru">RU</button>
          <button type="button" data-lang="en">EN</button>
        </div>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu"
                data-i18n-attr="aria-label:menu.open">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;
}

// В каждом прямоугольнике только название. Подпункты «Об авторе» (children)
// в меню не выводятся — их список на самой странице about.html.
function menuHtml(menu, site) {
  const cells = menu.map((item) => {
    const title = `<span class="menu-title" data-i18n="${escapeHtml(item.i18n)}"></span>`;
    if (item.id === 'shop') {
      return site.shop_url
        ? `<a class="menu-cell" data-id="shop" href="${escapeHtml(site.shop_url)}" target="_blank" rel="noopener">${title}</a>`
        : `<div class="menu-cell is-disabled" data-id="shop" aria-disabled="true">${title}</div>`;
    }
    return `<a class="menu-cell" data-id="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}">${title}</a>`;
  }).join('');

  return `
    <div class="menu-layer" id="site-menu" hidden>
      <nav class="menu-grid" data-i18n-attr="aria-label:common.menu">${cells}</nav>
    </div>`;
}

// Подвал столбиком: © год, кружки соцсетей со значками, строка про авторское право.
// noreferrer: с адресом нашего сайта pin.it вместо профиля отдаёт картинку 1×1 (чёрный экран).
function footerHtml(site) {
  const social = site.social || {};
  const links = SOCIAL
    .filter((k) => social[k])
    .map((k) => `
        <li><a class="social-icon" href="${escapeHtml(social[k])}" target="_blank" rel="noopener noreferrer"
               aria-label="${LABELS[k]}"><svg viewBox="${ICONS[k][0]}" aria-hidden="true"><path d="${ICONS[k][1]}"/></svg></a></li>`)
    .join('');
  return `
    <footer class="site-footer">
      <p class="footer-copy">© <span class="js-year">2026</span> <span data-i18n="footer.copyright">Алина Хоняк</span></p>
      ${links ? `<ul class="footer-social">${links}</ul>` : ''}
      <p class="footer-rights" data-i18n="footer.rights"></p>
    </footer>`;
}

// aria-current="page" у ссылок, ведущих на текущую страницу.
function markCurrent() {
  const here = location.pathname.split('/').pop() || 'index.html';
  qsa('.menu-layer a[href]').forEach((a) => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });
}

function wireMenu() {
  const toggle = qs('.menu-toggle');
  const layer = qs('#site-menu');
  if (!toggle || !layer) return;

  let hideTimer = null;

  const focusables = () => [qs('.wordmark'), ...qsa('.lang-switch button'), toggle,
    ...qsa('a[href]', layer)].filter(Boolean);

  const open = () => {
    clearTimeout(hideTimer);
    layer.hidden = false;
    // пересчёт стилей применяет display, затем класс — чтобы сработал переход
    // (без ожидания кадра: в фоновом браузере проверок кадры не рисуются)
    void layer.offsetWidth;
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', t('menu.close'));
  };
  const close = (returnFocus = true) => {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('menu.open'));
    hideTimer = setTimeout(() => { layer.hidden = true; }, 450);
    if (returnFocus) toggle.focus();
  };
  const isOpen = () => document.body.classList.contains('menu-open');

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  qsa('a[href]', layer).forEach((a) => a.addEventListener('click', () => close(false)));

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // ловушка фокуса: Tab ходит только по шапке и меню
    const list = focusables();
    const i = list.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
    else if (!e.shiftKey && (i === -1 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
  });
}
