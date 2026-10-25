// Список серий: обложки из data/series.json.

import { getJSON, qs, pick } from './util.js';
import { renderCards } from './cards.js';
import { revealize } from './ui.js';

export async function initSeries() {
  const mount = qs('#series-list');
  if (!mount) return;

  const series = await getJSON('data/series.json');
  mount.innerHTML = renderCards(series.map((s) => ({
    href: `series-view.html?slug=${encodeURIComponent(s.slug)}`,
    cover: s.cover,
    title: pick(s.title),
    summary: pick(s.summary),
  })));

  revealize(mount);
}
