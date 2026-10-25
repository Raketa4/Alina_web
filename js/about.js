// Об авторе: портрет и короткий рассказ из data/site.json,
// ссылки на подразделы — из пункта about в data/menu.json.

import { getJSON, qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { applyTranslations } from './i18n.js';

export async function initAbout() {
  const mount = qs('#about');
  if (!mount) return;

  const lang = getLang();
  const [site, menu] = await Promise.all([getSite(), getJSON('data/menu.json')]);
  const children = (menu.find((m) => m.id === 'about') || {}).children || [];

  const links = children.map((c) => `
        <li><a class="link" href="${escapeHtml(c.href)}" data-i18n="${escapeHtml(c.i18n)}"></a></li>`).join('');

  mount.innerHTML = `
    <div class="about">
      <figure class="about-portrait">
        <img src="${escapeHtml(site.portrait || '')}" alt="${escapeHtml(pick(site.name, lang))}">
        <figcaption>${escapeHtml(pick(site.portrait_credit, lang))}</figcaption>
      </figure>
      <div>
        <p class="lead">${escapeHtml(pick(site.about_short, lang))}</p>
        <ul class="about-links">${links}</ul>
      </div>
    </div>`;

  applyTranslations(mount);
}
