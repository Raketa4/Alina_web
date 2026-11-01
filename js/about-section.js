// Подразделы «Об авторе»: страница задаёт раздел через
// <main data-section="cv|statement">.
//   cv         — образование, выставки, награды из data/cv.json;
//   statement  — абзацы statement из data/site.json.

import { getJSON, qs, getLang, escapeHtml } from './util.js';
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
  } else if (section === 'cv') {
    const cv = await getJSON('data/cv.json');
    body = CV_PARTS.map((key) => cvList(cv[key], lang, t(`about.${key}`))).join('');
  }

  mount.innerHTML = body;
  revealize(mount);
}

// Список CV: период + текст; у записи с url текст — ссылка (публикации).
export function cvList(rows, lang, heading) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const items = rows.map((row) => `
      <div class="cv-row">
        <span class="period">${escapeHtml(row.period || '')}</span>
        <span>${row.url
    ? `<a class="link" href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row[lang] || row.ru || '')}</a>`
    : escapeHtml(row[lang] || row.ru || '')}</span>
      </div>`).join('');
  return `
    <section class="cv-section reveal">
      ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ''}
      <div class="cv-list">${items}</div>
    </section>`;
}
