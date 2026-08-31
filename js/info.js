// Инфо: разделы из data/info.json.

import { getJSON, qs, getLang, escapeHtml } from './util.js';
import { revealize } from './ui.js';

export async function initInfo() {
  const mount = qs('#info-content');
  if (!mount) return;

  const lang = getLang();
  const sections = await getJSON('data/info.json');

  mount.innerHTML = sections.map((s) => {
    const title = escapeHtml((s.title && (s.title[lang] || s.title.ru)) || '');
    const paras = ((s.body && (s.body[lang] || s.body.ru)) || [])
      .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    return `
      <article class="info-block reveal" id="${escapeHtml(s.id || '')}">
        <h3>${title}</h3>
        ${paras}
      </article>`;
  }).join('');

  revealize(mount);
}
