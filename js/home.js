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
  const titles = await workTitles();
  const altFor = (src) => titles.get(src) || pick({ ru: 'Алина Хоняк', en: 'Alina Khoniak' });
  const paras = (home.text?.[lang] || home.text?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const photos = (home.photos || []).map((src) => `
        <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="home">
          ${thumbImg(src, altFor(src))}
        </button>`).join('');

  mount.innerHTML = `
    <section class="container hero">
      <button type="button" class="hero-figure" data-zoom="${escapeHtml(hero.image || '')}">
        <img src="${escapeHtml(hero.image || '')}" alt="${escapeHtml(altFor(hero.image))}">
      </button>
      <p class="lead hero-text">${escapeHtml(pick(hero.text, lang))}</p>
    </section>
    <section class="container section">
      <div class="photo-grid">${photos}</div>
      <div class="prose home-text">${paras}</div>
    </section>`;

  revealize(mount);
}

// Подписи (alt) — названия работ из серий и проектов по пути к файлу:
// заменили фото в home.json — подпись сменится сама.
async function workTitles() {
  const [series, projects] = await Promise.all([
    getJSON('data/series.json').catch(() => []),
    getJSON('data/projects.json').catch(() => []),
  ]);
  const titles = new Map();
  projects.forEach((p) => {
    [p.cover, ...(p.images || [])].forEach((src) => titles.set(src, pick(p.title)));
  });
  series.forEach((s) => (s.works || []).forEach((w) => {
    titles.set(w.src, [pick(w.title), w.year].filter(Boolean).join(', '));
  }));
  return titles;
}
