// Поведение интерфейса: проявление при скролле,
// просмотр изображений (viewer.js), год в футере. ES-модуль.

import { qsa } from './util.js';
import { getSite } from './site.js';
import { initViewer } from './viewer.js';

let revealObserver = null;

export function initUI() {
  initReveal();
  initViewer();
  initYear();
  hydrateChrome();
}

// Подставляет ссылки из data/site.json в шапку/футер ([data-site-link="telegram"] и т.п.).
async function hydrateChrome() {
  const site = await getSite();
  const social = site.social || {};
  qsa('[data-site-link]').forEach((a) => {
    const key = a.dataset.siteLink;
    const href = key === 'email'
      ? (site.email ? `mailto:${site.email}` : null)
      : social[key];
    if (href) a.setAttribute('href', href);
    else a.closest('[data-site-optional]')?.remove();
  });
}

function initReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !('IntersectionObserver' in window)) {
    return; // .reveal остаётся видимым (см. CSS)
  }
  document.documentElement.classList.add('js-reveal');
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  qsa('.reveal').forEach((n) => revealObserver.observe(n));
}

// Подключить проявление для узлов, добавленных после инициализации.
export function revealize(root = document) {
  const nodes = qsa('.reveal:not(.is-visible)', root);
  if (revealObserver) nodes.forEach((n) => revealObserver.observe(n));
  else nodes.forEach((n) => n.classList.add('is-visible'));
}

function initYear() {
  qsa('.js-year').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
}
