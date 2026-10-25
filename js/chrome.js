// Общая «обвязка» каждой страницы: шапка, меню-плитка и подвал.
// Пункты меню — data/menu.json, ссылки соцсетей и магазина — data/site.json.
// Вызывается до applyTranslations: подписи проставляются через data-i18n.

import { getJSON, qs, qsa, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';

const SOCIAL = ['telegram', 'instagram', 'vk'];
const LABELS = { telegram: 'Telegram', instagram: 'Instagram', vk: 'VK' };

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

function menuHtml(menu, site) {
  const cells = menu.map((item) => {
    const title = `<span class="menu-title" data-i18n="${escapeHtml(item.i18n)}"></span>`;
    if (item.id === 'shop') {
      return site.shop_url
        ? `<a class="menu-cell" data-id="shop" href="${escapeHtml(site.shop_url)}" target="_blank" rel="noopener">${title}</a>`
        : `<div class="menu-cell is-disabled" data-id="shop" aria-disabled="true">${title}</div>`;
    }
    if (item.children) {
      const sub = item.children.map((c) => `
          <li><a href="${escapeHtml(c.href)}" data-i18n="${escapeHtml(c.i18n)}"></a></li>`).join('');
      return `
        <div class="menu-cell" data-id="${escapeHtml(item.id)}">
          <a class="menu-title" href="${escapeHtml(item.href)}" data-i18n="${escapeHtml(item.i18n)}"></a>
          <ul class="menu-sub">${sub}</ul>
        </div>`;
    }
    return `<a class="menu-cell" data-id="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}">${title}</a>`;
  }).join('');

  return `
    <div class="menu-layer" id="site-menu" hidden>
      <nav class="menu-grid" aria-label="Меню">${cells}</nav>
    </div>`;
}

function footerHtml(site) {
  const social = site.social || {};
  const links = SOCIAL
    .filter((k) => social[k])
    .map((k) => `<a href="${escapeHtml(social[k])}" target="_blank" rel="noopener">${LABELS[k]}</a>`)
    .join('');
  return `
    <footer class="site-footer">
      <span>© <span class="js-year">2026</span> <span data-i18n="footer.copyright">Алина Хоняк</span></span>
      <span class="footer-links">${links}</span>
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
    // кадр на применение display, затем класс — чтобы сработал переход
    requestAnimationFrame(() => document.body.classList.add('menu-open'));
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
