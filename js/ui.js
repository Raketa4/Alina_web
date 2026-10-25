// Поведение интерфейса: проявление при скролле,
// увеличение изображений, год в футере. ES-модуль.

import { qs, qsa } from './util.js';
import { t } from './i18n.js';
import { getSite } from './site.js';

let revealObserver = null;

export function initUI() {
  initReveal();
  initLightbox();
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

function initLightbox() {
  let box = null;

  const openBox = (src, alt) => {
    if (!box) {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = '<button type="button"></button><img alt="">';
      box.querySelector('button').textContent = t('common.close');
      box.addEventListener('click', (e) => {
        if (e.target === box || e.target.tagName === 'BUTTON') closeBox();
      });
      document.body.appendChild(box);
    }
    const img = box.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    box.querySelector('button').textContent = t('common.close');
    document.body.style.overflow = 'hidden';
    box.hidden = false;
  };
  const closeBox = () => {
    if (box) box.hidden = true;
    document.body.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-zoom]');
    if (!trigger) return;
    e.preventDefault();
    const full = trigger.dataset.zoom;
    const alt = trigger.querySelector('img')?.alt || trigger.getAttribute('aria-label');
    openBox(full, alt);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBox();
  });
}

function initYear() {
  qsa('.js-year').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
}
