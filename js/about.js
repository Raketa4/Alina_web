// Об авторе: artist statement из data/site.json и CV из data/cv.json.

import { getJSON, qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

const CV_ORDER = ['education', 'teaching', 'exhibitions', 'awards', 'curatorial', 'publications'];

export async function initAbout() {
  const lang = getLang();

  const statementMount = qs('#statement');
  if (statementMount) {
    const site = await getSite();
    const paras = (site.statement && site.statement[lang]) || (site.statement && site.statement.ru) || [];
    statementMount.innerHTML = paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('');

    const credit = qs('#portrait-credit');
    if (credit && site.portrait_credit) credit.textContent = pick(site.portrait_credit, lang);
  }

  const cvMount = qs('#cv');
  if (cvMount) {
    const cv = await getJSON('data/cv.json');
    cvMount.innerHTML = CV_ORDER
      .filter((key) => Array.isArray(cv[key]) && cv[key].length)
      .map((key) => {
        const rows = cv[key].map((row) => `
          <div class="cv-row">
            <span class="period">${escapeHtml(row.period || '')}</span>
            <span>${escapeHtml(row[lang] || row.ru || '')}</span>
          </div>`).join('');
        return `
          <section class="cv-section reveal">
            <h3>${escapeHtml(t(`about.${key}`))}</h3>
            <div class="cv-list">${rows}</div>
          </section>`;
      }).join('');
    revealize(cvMount);
  }
}
