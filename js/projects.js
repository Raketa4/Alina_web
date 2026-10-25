// Список проектов: обложки из data/projects.json.

import { getJSON, qs, pick } from './util.js';
import { renderCards } from './cards.js';
import { revealize } from './ui.js';

export async function initProjects() {
  const mount = qs('#projects-list');
  if (!mount) return;

  const projects = await getJSON('data/projects.json');
  mount.innerHTML = renderCards(projects.map((p) => ({
    href: `project.html?slug=${encodeURIComponent(p.slug)}`,
    cover: p.cover,
    title: pick(p.title),
    summary: pick(p.summary),
  })));

  revealize(mount);
}
