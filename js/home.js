// Главная: «Чувашская свадьба» с текстом, ниже фотографии и описание.
// Всё из data/home.json.

import { getJSON, qs, getLang, pick, escapeHtml, thumbImg } from './util.js';
import { revealize } from './ui.js';

export async function initHome() {
  const mount = qs('#home');
  if (!mount) return;

  const lang = getLang();
  const home = await getJSON('data/home.json');
  const hero = home.hero || {};
  const paras = (home.text?.[lang] || home.text?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const photos = (home.photos || []).map((src, i) => `
        <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="home">
          ${thumbImg(src, `${i + 1}`)}
        </button>`).join('');

  mount.innerHTML = `
    <section class="container hero">
      <button type="button" class="hero-figure" data-zoom="${escapeHtml(hero.image || '')}">
        <img src="${escapeHtml(hero.image || '')}" alt="${escapeHtml(pick({ ru: 'Чувашская свадьба', en: 'The Chuvash Wedding' }))}">
      </button>
      <p class="lead hero-text">${escapeHtml(pick(hero.text, lang))}</p>
    </section>
    <section class="container section">
      <div class="photo-grid">${photos}</div>
      <div class="prose home-text">${paras}</div>
    </section>`;

  revealize(mount);
}
