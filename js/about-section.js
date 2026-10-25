// Подразделы «Об авторе»: страница задаёт раздел через
// <main data-section="cv|statement|teaching|curatorial|publications">.
//   cv         — образование, выставки, награды из data/cv.json;
//   statement  — абзацы statement из data/site.json;
//   остальные  — список из data/cv.json[раздел] + фото из data/sections.json.

import { getJSON, qs, getLang, escapeHtml, thumbImg } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

const CV_PARTS = ['education', 'exhibitions', 'awards'];

export async function initAboutSection() {
  const main = qs('main[data-section]');
  const mount = qs('#section');
  if (!main || !mount) return;

  const section = main.dataset.section;
  const lang = getLang();
  let body = '';

  if (section === 'statement') {
    const site = await getSite();
    const paras = site.statement?.[lang] || site.statement?.ru || [];
    body = `<div class="prose">${paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div>`;
  } else {
    const cv = await getJSON('data/cv.json');
    if (section === 'cv') {
      body = CV_PARTS.map((key) => cvList(cv[key], lang, t(`about.${key}`))).join('');
    } else {
      const sections = await getJSON('data/sections.json');
      const photos = (sections[section]?.images || []).map((src, i) => `
          <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="${escapeHtml(section)}">
            ${thumbImg(src, `${t(`menu.${section}`)} — ${i + 1}`)}
          </button>`).join('');
      body = cvList(cv[section], lang, '') + `<div class="photo-grid section-photos">${photos}</div>`;
    }
  }

  mount.innerHTML = body;
  revealize(mount);
}

function cvList(rows, lang, heading) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const items = rows.map((row) => `
      <div class="cv-row">
        <span class="period">${escapeHtml(row.period || '')}</span>
        <span>${escapeHtml(row[lang] || row.ru || '')}</span>
      </div>`).join('');
  return `
    <section class="cv-section reveal">
      ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ''}
      <div class="cv-list">${items}</div>
    </section>`;
}
