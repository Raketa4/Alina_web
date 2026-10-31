// Инфо: документы из data/info.json раскрывающимся списком (<details>).
// Текст раздела — массив строк: «## » — подзаголовок, «### » — подзаголовок
// второго уровня, «- » — пункт списка, остальное — абзац. В строках адреса
// https://… и e-mail становятся ссылками, [текст](#id) — ссылка на пункт.
// Нет английского текста — показывается русский с пометкой.

import { getJSON, qs, getLang, escapeHtml, pick } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initInfo() {
  const mount = qs('#info-content');
  if (!mount) return;

  const lang = getLang();
  const sections = await getJSON('data/info.json');

  mount.innerHTML = `<div class="info-list">${sections.map((s) => {
    const own = s.body && s.body[lang];
    const ruOnly = !own && lang !== 'ru';
    const note = ruOnly ? `<p class="info-note">${escapeHtml(t('info.ruOnly'))}</p>` : '';
    return `
      <details class="info-item reveal" id="${escapeHtml(s.id || '')}">
        <summary><h2 class="info-title">${escapeHtml(pick(s.title, lang))}</h2></summary>
        ${note}
        <div class="info-body"${ruOnly ? ' lang="ru"' : ''}>${blocksHtml(own || (s.body && s.body.ru) || [])}</div>
      </details>`;
  }).join('')}</div>`;

  revealize(mount);
  // при загрузке — мгновенно, как обычный переход по якорю; дальше — плавно
  openFromHash('instant');
  window.addEventListener('hashchange', () => openFromHash('smooth'));
}

// info.html#consent — открыть этот пункт и прокрутить к нему.
function openFromHash(behavior) {
  const id = decodeURIComponent(location.hash.slice(1));
  const item = id && document.getElementById(id);
  if (!item || !item.matches('details.info-item')) return;
  item.open = true;
  item.scrollIntoView({ block: 'start', behavior });
}

function blocksHtml(lines) {
  let html = '';
  let list = [];
  const flush = () => {
    if (list.length) html += `<ul>${list.join('')}</ul>`;
    list = [];
  };
  lines.forEach((line) => {
    if (line.startsWith('- ')) { list.push(`<li>${inline(line.slice(2))}</li>`); return; }
    flush();
    if (line.startsWith('### ')) html += `<h4>${inline(line.slice(4))}</h4>`;
    else if (line.startsWith('## ')) html += `<h3>${inline(line.slice(3))}</h3>`;
    else html += `<p>${inline(line)}</p>`;
  });
  flush();
  return html;
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((#[\w-]+)\)/g, '<a class="link" href="$2">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,;:)])/g,
      '$1<a class="link" href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+(\.[\w-]+)+)/g, '$1<a class="link" href="mailto:$2">$2</a>');
}
