// Загрузчик Яндекс.Метрики. Работает только если в data/site.json
// заполнен metrika_id — иначе не подключает ничего.

import { getJSON } from './util.js';

export async function initAnalytics() {
  let site;
  try {
    site = await getJSON('data/site.json');
  } catch (_) {
    return;
  }
  const id = String(site.metrika_id || '').trim();
  if (!id) return;

  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    k = e.createElement(t); a = e.getElementsByTagName(t)[0];
    k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

  window.ym(id, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  });
}
