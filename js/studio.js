// Мастерская: вверху блок «посетите мастерскую» (кнопка ведёт в Telegram из
// site.json), ниже описание (если есть) и фотографии процесса из data/studio.json.

import { getJSON, qs, qsa, getLang, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';
import { fillContactLinks } from './site.js';

export async function initStudio() {
  fillContactLinks();
  const mount = qs('#studio');
  if (!mount) return;

  const lang = getLang();
  const studio = await getJSON('data/studio.json');
  const paras = (studio.text?.[lang] || studio.text?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const photos = (studio.images || []).map((src, i) => `
        <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="studio">
          ${thumbImg(src, `${t('menu.studio')} — ${i + 1}`)}
        </button>`).join('');

  mount.innerHTML = `
    ${paras ? `<div class="prose">${paras}</div>` : ''}
    ${photos ? `<div class="studio-photos">${photos}</div>` : ''}`;

  // ширина фото пропорциональна его сторонам — в ряду фото одной высоты
  qsa('.studio-photos img', mount).forEach((img) => {
    const fit = () => {
      if (img.naturalWidth) img.parentElement.style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
    };
    if (img.complete) fit();
    img.addEventListener('load', fit);
  });

  revealize(mount);
}
