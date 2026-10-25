// Один проект: project.html?slug=… — текст и фотографии.

import { getJSON, qs, param, pick, getLang, escapeHtml, thumbImg } from './util.js';
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
        <h1>${escapeHtml(t('project.notFoundTitle'))}</h1>
        <p>${escapeHtml(t('project.notFoundText'))}</p>
        <a class="link" href="projects.html">← ${escapeHtml(t('project.back'))}</a>
      </div>`;
    return;
  }

  const title = pick(project.title);
  document.title = `${title} — ${pick({ ru: 'Алина Хоняк', en: 'Alina Khoniak' })}`;

  const lang = getLang();
  const paras = (project.text?.[lang] || project.text?.ru || [])
    .map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const photos = (project.images || []).map((src, i) => `
        <button type="button" class="reveal" data-zoom="${escapeHtml(src)}" data-gallery="project">
          ${thumbImg(src, `${title} — ${i + 1}`)}
        </button>`).join('');

  mount.innerHTML = `
    <div class="container page-head">
      <div class="back-link"><a class="link" href="projects.html">← ${escapeHtml(t('project.back'))}</a></div>
      <h1>${escapeHtml(title)}</h1>
      <div class="prose">${paras}</div>
    </div>
    <section class="container">
      <div class="photo-grid">${photos}</div>
    </section>`;

  revealize(mount);
}
