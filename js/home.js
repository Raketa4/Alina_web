// Главная: блок избранных работ из data/catalog.json по списку id
// в data/site.json (поле featured).

import { getJSON, qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { revealize } from './ui.js';

export async function initHome() {
  const lang = getLang();
  const site = await getSite();

  hydrateHero(site, lang);

  const mount = qs('#featured-works');
  if (!mount) return;

  const catalog = await getJSON('data/catalog.json');

  const byId = new Map(catalog.map((w) => [w.id, w]));
  const ids = Array.isArray(site.featured) && site.featured.length
    ? site.featured
    : catalog.slice(0, 4).map((w) => w.id);

  const works = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!works.length) {
    mount.closest('.section')?.remove();
    return;
  }

  mount.innerHTML = works.map((w) => {
    const title = escapeHtml(pick(w.title));
    const thumb = escapeHtml(w.image.replace('-full', '-thumb'));
    const sub = escapeHtml([pick(w.medium), w.size, w.year].filter(Boolean).join(' · '));
    return `
      <a class="work reveal" href="catalog.html">
        <span class="work-figure"><img src="${thumb}" alt="${title}" loading="lazy"></span>
        <span class="work-meta">
          <span class="work-title">${title}</span>
          <span class="work-sub">${sub}</span>
        </span>
      </a>`;
  }).join('');

  revealize(mount);
}

function hydrateHero(site, lang) {
  const set = (sel, value) => { const n = qs(sel); if (n && value) n.textContent = value; };
  set('#hero-role', pick(site.role, lang));
  set('#hero-name', pick(site.name, lang));
  set('#hero-intro', pick(site.intro, lang));
}
