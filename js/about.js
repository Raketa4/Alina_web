// Об авторе: портрет и Artist statement из data/site.json, ниже полное CV
// из data/cv.json — вместе с преподаванием, кураторскими проектами и публикациями.

import { getJSON, qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { applyTranslations, t } from './i18n.js';
import { revealize } from './ui.js';
import { cvList } from './about-section.js';

const CV_PARTS = ['education', 'teaching', 'exhibitions', 'curatorial', 'awards', 'publications'];

export async function initAbout() {
  const mount = qs('#about');
  if (!mount) return;

  const lang = getLang();
  const [site, cv] = await Promise.all([getSite(), getJSON('data/cv.json')]);

  const credit = pick(site.portrait_credit, lang); // подпись фотографа — только если задана
  const paras = (site.statement?.[lang] || site.statement?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');

  mount.innerHTML = `
    <div class="about">
      <figure class="about-portrait">
        <img src="${escapeHtml(site.portrait || '')}" width="1200" height="1600" alt="${escapeHtml(pick(site.name, lang))}">
        ${credit ? `<figcaption>${escapeHtml(credit)}</figcaption>` : ''}
      </figure>
      <div class="about-statement">
        <h2 data-i18n="about.statementTitle">Описание творчества</h2>
        <div class="prose">${paras}</div>
      </div>
    </div>
    <div class="about-cv">
      <h2 class="about-cv-title" data-i18n="menu.cv">Биография</h2>
      ${CV_PARTS.map((key) => cvList(cv[key], lang, t(`about.${key}`))).join('')}
    </div>`;

  applyTranslations(mount);
  revealize(mount);
}
