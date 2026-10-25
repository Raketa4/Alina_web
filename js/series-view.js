// Одна серия: series-view.html?slug=…
// Только изображения, без подписей; клик открывает просмотрщик.

import { getJSON, qs, param, pick, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initSeriesView() {
  const mount = qs('#series-view');
  if (!mount) return;

  const slug = param('slug');
  const series = await getJSON('data/series.json');
  const item = series.find((s) => s.slug === slug);

  if (!item) {
    mount.innerHTML = `
      <div class="state">
        <h1>${escapeHtml(t('series.notFoundTitle'))}</h1>
        <p>${escapeHtml(t('series.notFoundText'))}</p>
        <a class="link" href="series.html">← ${escapeHtml(t('series.back'))}</a>
      </div>`;
    return;
  }

  const title = pick(item.title);
  document.title = `${title} — ${pick({ ru: 'Алина Хоняк', en: 'Alina Khoniak' })}`;

  // Название и год — только в alt (для поисковиков и экранных дикторов).
  const photos = (item.works || []).map((w) => {
    const alt = [pick(w.title), w.year].filter(Boolean).join(', ');
    return `
        <button type="button" class="reveal" data-zoom="${escapeHtml(w.src)}" data-gallery="series">
          ${thumbImg(w.src, alt)}
        </button>`;
  }).join('');

  mount.innerHTML = `
    <div class="container page-head">
      <div class="back-link"><a class="link" href="series.html">← ${escapeHtml(t('series.back'))}</a></div>
      <h1>${escapeHtml(title)}</h1>
    </div>
    <section class="container">
      <div class="photo-grid">${photos}</div>
    </section>`;

  revealize(mount);
}
