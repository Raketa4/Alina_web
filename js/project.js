// Страница одной серии: project.html?slug=…

import { getJSON, qs, param, pick, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initProject() {
  const mount = qs('#project');
  if (!mount) return;

  const slug = param('slug');
  const projects = await getJSON('data/projects.json');
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    mount.innerHTML = `
      <div class="state">
        <p class="eyebrow">404</p>
        <h1>${escapeHtml(t('project.notFoundTitle'))}</h1>
        <p>${escapeHtml(t('project.notFoundText'))}</p>
        <a class="btn" href="projects.html">${escapeHtml(t('project.back'))}</a>
      </div>`;
    return;
  }

  const title = pick(project.title);
  document.title = `${title} — ${pick({ ru: 'Алина Хоняк', en: 'Alina Khoniak' })}`;

  const meta = escapeHtml([pick(project.role), project.year].filter(Boolean).join(' · '));
  const gallery = (project.images || []).map((src, i) => `
      <figure class="work reveal">
        <button class="work-figure hover-zoom" type="button" data-zoom="${escapeHtml(src)}" aria-label="${escapeHtml(title)} — ${i + 1}">
          ${thumbImg(src, `${title} — ${i + 1}`)}
        </button>
      </figure>`).join('');

  mount.innerHTML = `
    <div class="page-head">
      <div class="back-link"><a class="link" href="projects.html">← ${escapeHtml(t('project.back'))}</a></div>
      <p class="eyebrow">${meta}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(pick(project.description) || '')}</p>
      <p class="catalog-cta"><a class="link link--accent" href="catalog.html?project=${encodeURIComponent(project.slug)}">${escapeHtml(t('project.seeInCatalog'))}</a></p>
    </div>
    <hr class="rule">
    <div class="section">
      <h2 class="eyebrow section-label">${escapeHtml(t('project.worksTitle'))}</h2>
      <div class="gallery-grid">${gallery}</div>
    </div>`;

  revealize(mount);
}
