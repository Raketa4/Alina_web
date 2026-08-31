// Список проектов: карточки серий из data/projects.json.

import { getJSON, qs, pick, escapeHtml } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

export async function initProjects() {
  const mount = qs('#projects-list');
  if (!mount) return;

  const projects = await getJSON('data/projects.json');

  mount.innerHTML = projects.map((p) => {
    const title = escapeHtml(pick(p.title));
    const cover = escapeHtml((p.cover || '').replace('-full', '-thumb'));
    const role = escapeHtml(pick(p.role) || '');
    const meta = escapeHtml([role, p.year].filter(Boolean).join(' · '));
    const desc = escapeHtml(pick(p.description) || '');
    const href = `project.html?slug=${encodeURIComponent(p.slug)}`;
    return `
      <article class="work project-card reveal">
        <a class="work-figure hover-zoom" href="${href}" aria-label="${title}">
          <img src="${cover}" alt="${title}" loading="lazy">
        </a>
        <div class="work-meta">
          <h3 class="work-title">${title}</h3>
          <span class="work-sub">${meta}</span>
          <p>${desc}</p>
          <a class="link link--accent" href="${href}">${escapeHtml(t('projects.view'))}</a>
        </div>
      </article>`;
  }).join('');

  revealize(mount);
}
