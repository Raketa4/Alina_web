// Сетка обложек для списков серий и проектов:
// обложка, под ней название и короткое описание; вся карточка — ссылка.

import { escapeHtml, thumbImg } from './util.js';

export function renderCards(items) {
  const cards = items.map(({ href, cover, title, summary }) => `
      <a class="card reveal" href="${escapeHtml(href)}">
        <span class="card-cover">${thumbImg(cover || '', title)}</span>
        <span class="card-title">${escapeHtml(title)}</span>
        <span class="card-summary">${escapeHtml(summary || '')}</span>
      </a>`).join('');
  return `<div class="cards">${cards}</div>`;
}
