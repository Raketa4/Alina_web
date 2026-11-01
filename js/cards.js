// Список проектов: карточки друг под другом — обложка, название и короткое
// описание (на компьютере текст справа от обложки); вся карточка — ссылка.

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
