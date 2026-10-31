// Об авторе: портрет и Artist statement из data/site.json, ниже полное CV
// из data/cv.json, внизу ссылки на подразделы из пункта about в data/menu.json
// (кроме CV и Statement — они уже на этой странице).

import { getJSON, qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { applyTranslations, t } from './i18n.js';
import { revealize } from './ui.js';
import { cvList } from './about-section.js';

const CV_PARTS = ['education', 'teaching', 'exhibitions', 'curatorial', 'awards', 'publications'];
const ON_PAGE = ['cv', 'statement'];

export async function initAbout() {
  const mount = qs('#about');
  if (!mount) return;

  const lang = getLang();
  const [site, menu, cv] = await Promise.all([getSite(), getJSON('data/menu.json'), getJSON('data/cv.json')]);
  const children = ((menu.find((m) => m.id === 'about') || {}).children || [])
    .filter((c) => !ON_PAGE.includes(c.id));

  const credit = pick(site.portrait_credit, lang); // подпись фотографа — только если задана
  const paras = (site.statement?.[lang] || site.statement?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const links = children.map((c) => `
        <li><a class="link" href="${escapeHtml(c.href)}" data-i18n="${escapeHtml(c.i18n)}"></a></li>`).join('');

  mount.innerHTML = `
    <div class="about">
      <figure class="about-portrait">
        <img src="${escapeHtml(site.portrait || '')}" width="1200" height="1600" alt="${escapeHtml(pick(site.name, lang))}">
        ${credit ? `<figcaption>${escapeHtml(credit)}</figcaption>` : ''}
      </figure>
      <div class="about-statement">
        <h2 data-i18n="about.statementTitle">Artist statement</h2>
        <div class="prose">${paras}</div>
      </div>
    </div>
    <div class="about-cv">
      <h2 class="about-cv-title" data-i18n="menu.cv">CV</h2>
      ${CV_PARTS.map((key) => cvList(cv[key], lang, t(`about.${key}`))).join('')}
    </div>
    ${links ? `<ul class="about-links">${links}</ul>` : ''}`;

  applyTranslations(mount);
  revealize(mount);
}
