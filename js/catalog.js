// Каталог: сетка работ, фильтры по серии и статусу (в URL),
// кнопка заявки (mailto, иначе Telegram).

import {
  getJSON, qs, qsa, getLang, pick, escapeHtml, fillTemplate, param, urlWithParams, thumbImg,
} from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

const STATUSES = ['available', 'reserved', 'sold'];

export async function initCatalog() {
  const grid = qs('#catalog-grid');
  if (!grid) return;

  const lang = getLang();
  const [site, catalog, projects] = await Promise.all([
    getSite(),
    getJSON('data/catalog.json'),
    getJSON('data/projects.json'),
  ]);

  const projectTitle = new Map(projects.map((p) => [p.slug, pick(p.title, lang)]));

  const state = {
    project: param('project') || 'all',
    status: param('status') || 'all',
  };

  buildFilters(projects, projectTitle);
  render();

  function buildFilters(projs, titles) {
    const projGroup = qs('#filter-project');
    const statusGroup = qs('#filter-status');
    if (projGroup) {
      projGroup.append(...[
        makeBtn('project', 'all', t('catalog.all')),
        ...projs
          .filter((p) => catalog.some((w) => w.project === p.slug))
          .map((p) => makeBtn('project', p.slug, titles.get(p.slug) || p.slug)),
      ]);
    }
    if (statusGroup) {
      statusGroup.append(...[
        makeBtn('status', 'all', t('catalog.all')),
        ...STATUSES
          .filter((s) => catalog.some((w) => w.status === s))
          .map((s) => makeBtn('status', s, t(`catalog.status${cap(s)}`))),
      ]);
    }
  }

  function makeBtn(dim, value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.dim = dim;
    btn.dataset.value = value;
    btn.setAttribute('aria-pressed', String(state[dim] === value));
    btn.addEventListener('click', () => {
      state[dim] = value;
      history.replaceState(null, '', urlWithParams({
        project: state.project === 'all' ? null : state.project,
        status: state.status === 'all' ? null : state.status,
      }).toString());
      qsa(`button[data-dim="${dim}"]`).forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
      });
      render();
    });
    return btn;
  }

  function render() {
    const items = catalog.filter((w) =>
      (state.project === 'all' || w.project === state.project)
      && (state.status === 'all' || w.status === state.status));

    if (!items.length) {
      grid.innerHTML = `<p class="lead">${escapeHtml(t('catalog.empty'))}</p>`;
      return;
    }

    grid.innerHTML = items.map((w) => card(w)).join('');
    revealize(grid);
  }

  function card(w) {
    const title = pick(w.title, lang);
    const full = w.image;
    const sub = [pick(w.medium, lang), w.size, w.year].filter(Boolean).join(' · ');
    const price = w.price ? escapeHtml(w.price) : escapeHtml(t('catalog.priceOnRequest'));
    const statusLabel = t(`catalog.status${cap(w.status)}`);

    let action;
    if (w.status === 'sold') {
      action = `<span class="btn" aria-disabled="true">${escapeHtml(statusLabel)}</span>`;
    } else {
      const href = inquiryHref(w);
      action = `<a class="btn btn--accent" href="${escapeHtml(href)}">${escapeHtml(t('catalog.inquire'))}</a>`;
    }

    return `
      <article class="card reveal">
        <button class="work-figure hover-zoom" type="button" data-zoom="${escapeHtml(full)}" aria-label="${escapeHtml(title)}">
          ${thumbImg(full, title)}
        </button>
        <div class="card-body">
          <span class="badge badge--${w.status}">${escapeHtml(statusLabel)}</span>
          <span class="work-title">${escapeHtml(title)}</span>
          <span class="work-sub">${escapeHtml(sub)}</span>
          <span class="work-sub">${price}</span>
        </div>
        <div class="card-actions">${action}</div>
      </article>`;
  }

  function inquiryHref(w) {
    const data = { title: pick(w.title, lang), year: w.year, size: w.size };
    if (site.email) {
      const subject = fillTemplate(t('inquiry.subjectWork'), data);
      const body = fillTemplate(t('inquiry.bodyWork'), data);
      return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    return (site.social && site.social.telegram) || 'contacts.html';
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
