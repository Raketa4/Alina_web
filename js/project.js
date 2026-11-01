// Один проект: project.html?slug=… — сверху главная картинка (cover),
// ниже текст и остальные фотографии (images).

import { getJSON, qs, param, pick, setCanonicalParams, getLang, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initProject() {
  const mount = qs('#project');
  if (!mount) return;

  const slug = param('slug');
  const projects = await getJSON('data/projects.json');
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    // Раньше серии жили в project.html?slug=… — старые ссылки ведут к ленте серии.
    const series = await getJSON('data/series.json').catch(() => []);
    if (slug && series.some((s) => s.slug === slug)) {
      location.replace(`series.html#${encodeURIComponent(slug)}`);
      return;
    }
    mount.innerHTML = `
      <div class="state">
        <h1>${escapeHtml(t('project.notFoundTitle'))}</h1>
        <p>${escapeHtml(t('project.notFoundText'))}</p>
        <a class="link" href="projects.html">← ${escapeHtml(t('project.back'))}</a>
      </div>`;
    return;
  }

  const title = pick(project.title);
  document.title = `${title} — ${pick({ ru: 'Алина Хоняк', en: 'Alina Khoniak' })}`;
  setCanonicalParams({ slug: project.slug });

  const lang = getLang();
  const paras = (project.text?.[lang] || project.text?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const photos = (project.images || []).map((src, i) => `
        <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="project">
          ${thumbImg(src, `${title} — ${i + 2}`)}
        </button>`).join('');

  mount.innerHTML = `
    <div class="container page-head">
      <div class="back-link"><a class="link" href="projects.html">← ${escapeHtml(t('project.back'))}</a></div>
      <h1>${escapeHtml(title)}</h1>
    </div>
    <section class="container project-hero">
      <button type="button" class="hero-figure" data-zoom="${escapeHtml(project.cover || '')}" data-gallery="project">
        <img src="${escapeHtml(project.cover || '')}" alt="${escapeHtml(title)}">
      </button>
    </section>
    <section class="container section">
      <div class="prose project-text">${paras}</div>
      <div class="photo-grid">${photos}</div>
    </section>`;

  revealize(mount);
}
