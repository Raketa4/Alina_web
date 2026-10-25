// Мастерская: общее описание и фотографии процесса из data/studio.json.

import { getJSON, qs, getLang, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initStudio() {
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
    <div class="prose">${paras}</div>
    <div class="photo-grid section-photos">${photos}</div>`;

  revealize(mount);
}
