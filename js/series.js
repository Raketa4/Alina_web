// Серии: по ленте на каждую серию из data/series.json, ленты друг под другом.
// Картины в ленте одной высоты, под каждой подпись: название, размер, техника, год
// (из тех полей, что заданы; у работы без них подписи нет).
// Стрелки листают ленту, на телефоне — пальцем; клик открывает просмотрщик.
// series.html#<slug> прокручивает к нужной ленте (так ведут старые ссылки серий).

import { getJSON, qs, qsa, getLang, pick, escapeHtml, thumbImg } from './util.js';
import { t } from './i18n.js';
import { revealize } from './ui.js';

const QUOTES = { ru: ['«', '»'], en: ['“', '”'] };

export async function initSeries() {
  const mount = qs('#series-list');
  if (!mount) return;

  const series = await getJSON('data/series.json');
  mount.innerHTML = series.map(stripHtml).join('');
  qsa('.strip', mount).forEach(initStrip);
  revealize(mount);

  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}

function stripHtml(s) {
  const lang = getLang();
  const [open, close] = QUOTES[lang] || QUOTES.ru;
  const title = pick(s.title);
  const items = (s.works || []).map((w, i) => {
    const name = pick(w.title);
    const meta = [w.size && `${w.size} ${t('series.cm')}`, pick(w.medium), w.year].filter(Boolean).join(' · ');
    const alt = name ? [name, w.year].filter(Boolean).join(', ') : `${title} — ${i + 1}`;
    const caption = name || meta ? `
          <figcaption>
            ${name ? `<span class="strip-title">${escapeHtml(`${open}${name}${close}`)}</span>` : ''}
            ${meta ? `<span class="strip-meta">${escapeHtml(meta)}</span>` : ''}
          </figcaption>` : '';
    return `
        <figure class="strip-item">
          <button type="button" data-zoom="${escapeHtml(w.src)}" data-gallery="${escapeHtml(s.slug)}">
            ${thumbImg(w.src, alt, '', w)}
          </button>${caption}
        </figure>`;
  }).join('');

  return `
    <section class="strip reveal" id="${escapeHtml(s.slug)}">
      <div class="strip-head">
        <h2>${escapeHtml(title)}</h2>
        <div class="strip-nav">
          <button type="button" class="strip-arrow" data-dir="-1" aria-label="${escapeHtml(t('series.prev'))}"><span aria-hidden="true">←</span></button>
          <button type="button" class="strip-arrow" data-dir="1" aria-label="${escapeHtml(t('series.next'))}"><span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div class="strip-track" tabindex="0" role="region" aria-label="${escapeHtml(title)}">${items}
      </div>
    </section>`;
}

// Стрелка листает на ширину ленты без последней видимой картины; у краёв гаснет.
function initStrip(strip) {
  const track = qs('.strip-track', strip);
  const arrows = qsa('.strip-arrow', strip);
  const update = () => {
    const end = track.scrollWidth - track.clientWidth - 1;
    arrows.forEach((b) => {
      b.disabled = b.dataset.dir === '-1' ? track.scrollLeft <= 0 : track.scrollLeft >= end;
    });
    qs('.strip-nav', strip).hidden = end <= 0;
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  arrows.forEach((b) => b.addEventListener('click', () => {
    track.scrollBy({ left: Number(b.dataset.dir) * track.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
