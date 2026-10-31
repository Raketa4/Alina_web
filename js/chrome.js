// Общая «обвязка» каждой страницы: шапка, меню и подвал.
// Пункты меню — data/menu.json, ссылки соцсетей и магазина — data/site.json.
// Вызывается до applyTranslations: подписи проставляются через data-i18n.

import { getJSON, qs, qsa, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';

const SOCIAL = ['telegram', 'instagram', 'vk'];
const LABELS = { telegram: 'Telegram', instagram: 'Instagram', vk: 'VK' };
// Значки соцсетей — Simple Icons (CC0); у Telegram оставлен только самолётик.
const ICONS = {
  telegram: ['3.8 5.25 15 15', 'M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'],
  instagram: ['0 0 24 24', 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077'],
  vk: ['0 0 24 24', 'm9.489.004.729-.003h3.564l.73.003.914.01.433.007.418.011.403.014.388.016.374.021.36.025.345.03.333.033c1.74.196 2.933.616 3.833 1.516.9.9 1.32 2.092 1.516 3.833l.034.333.029.346.025.36.02.373.025.588.012.41.013.644.009.915.004.98-.001 3.313-.003.73-.01.914-.007.433-.011.418-.014.403-.016.388-.021.374-.025.36-.03.345-.033.333c-.196 1.74-.616 2.933-1.516 3.833-.9.9-2.092 1.32-3.833 1.516l-.333.034-.346.029-.36.025-.373.02-.588.025-.41.012-.644.013-.915.009-.98.004-3.313-.001-.73-.003-.914-.01-.433-.007-.418-.011-.403-.014-.388-.016-.374-.021-.36-.025-.345-.03-.333-.033c-1.74-.196-2.933-.616-3.833-1.516-.9-.9-1.32-2.092-1.516-3.833l-.034-.333-.029-.346-.025-.36-.02-.373-.025-.588-.012-.41-.013-.644-.009-.915-.004-.98.001-3.313.003-.73.01-.914.007-.433.011-.418.014-.403.016-.388.021-.374.025-.36.03-.345.033-.333c.196-1.74.616-2.933 1.516-3.833.9-.9 2.092-1.32 3.833-1.516l.333-.034.346-.029.36-.025.373-.02.588-.025.41-.012.644-.013.915-.009ZM6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z'],
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
      <nav class="menu-grid" aria-label="Меню">${cells}</nav>
    </div>`;
}

// Подвал столбиком: © год, кружки соцсетей со значками, строка про авторское право.
function footerHtml(site) {
  const social = site.social || {};
  const links = SOCIAL
    .filter((k) => social[k])
    .map((k) => `
        <li><a class="social-icon" href="${escapeHtml(social[k])}" target="_blank" rel="noopener"
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
