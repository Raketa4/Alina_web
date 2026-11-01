// Просмотрщик изображений: открывается по клику на [data-zoom].
// Листает все [data-zoom] с тем же data-gallery (в порядке DOM),
// приближает колесом мыши, двойным кликом и щипком, двигает перетаскиванием.
// Подпись под изображением — копия <figcaption> из той же <figure>, что и
// [data-zoom] (ленты серий); нет её — только изображение. При приближении
// подпись прячется, но место держит — центр изображения не прыгает.

import { qsa } from './util.js';
import { t } from './i18n.js';

const MIN = 1;
const MAX = 4;
const DOUBLE = 2.5;
const SWIPE = 50;

let box, stage, img, caption, btnPrev, btnNext;
let items = [];
let index = 0;
let trigger = null;
const view = { scale: 1, x: 0, y: 0 };

export function initViewer() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-zoom]');
    if (!el) return;
    e.preventDefault();
    open(el);
  });
}

function build() {
  box = document.createElement('div');
  box.className = 'viewer';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <div class="viewer-stage">
      <img class="viewer-img" alt="" draggable="false">
      <div class="viewer-caption" id="viewer-caption" hidden></div>
    </div>
    <button type="button" class="viewer-btn viewer-close"><span aria-hidden="true">✕</span></button>
    <button type="button" class="viewer-btn viewer-prev"><span aria-hidden="true">←</span></button>
    <button type="button" class="viewer-btn viewer-next"><span aria-hidden="true">→</span></button>`;
  document.body.appendChild(box);

  stage = box.querySelector('.viewer-stage');
  img = box.querySelector('.viewer-img');
  caption = box.querySelector('.viewer-caption');
  btnPrev = box.querySelector('.viewer-prev');
  btnNext = box.querySelector('.viewer-next');
  box.querySelector('.viewer-close').setAttribute('aria-label', t('common.close'));
  btnPrev.setAttribute('aria-label', t('common.prev'));
  btnNext.setAttribute('aria-label', t('common.next'));

  box.querySelector('.viewer-close').addEventListener('click', close);
  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('dblclick', onDouble);
  wirePointers();
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => {
    if (box.hidden) return;
    fitCaption();
    setView(view.scale, view.x, view.y);
  });
}

function open(el) {
  if (!box) build();
  trigger = el;
  const group = el.dataset.gallery;
  items = group ? qsa(`[data-zoom][data-gallery="${CSS.escape(group)}"]`) : [el];
  index = Math.max(0, items.indexOf(el));
  box.hidden = false; // до show(): высоту подписи можно измерить только на видимом слое
  show();
  document.body.classList.add('viewer-open');
  box.querySelector('.viewer-close').focus();
}

function close() {
  if (!box || box.hidden) return;
  box.hidden = true;
  document.body.classList.remove('viewer-open');
  trigger?.focus();
}

function show() {
  const el = items[index];
  img.src = el.dataset.zoom;
  img.alt = el.querySelector('img')?.alt || '';
  const source = el.closest('figure')?.querySelector('figcaption');
  caption.replaceChildren(...[...(source?.childNodes || [])].map((n) => n.cloneNode(true)));
  caption.hidden = !source;
  if (source) box.setAttribute('aria-describedby', caption.id);
  else box.removeAttribute('aria-describedby');
  fitCaption();
  btnPrev.hidden = btnNext.hidden = items.length < 2;
  reset();
}

// Изображение уступает подписи ровно её высоту (CSS: --viewer-cap).
function fitCaption() {
  const h = caption.hidden ? 0 : caption.offsetHeight + parseFloat(getComputedStyle(caption).marginTop);
  stage.style.setProperty('--viewer-cap', `${h}px`);
}

function go(step) {
  if (items.length < 2) return;
  index = (index + step + items.length) % items.length;
  show();
}

// --- масштаб и сдвиг -------------------------------------------------

function reset() { setView(1, 0, 0); }

function apply() {
  img.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  stage.classList.toggle('is-zoomed', view.scale > 1);
}

// Центр изображения без сдвига и масштаба — относительно сцены. С подписью
// изображение стоит выше центра сцены, поэтому считаем от него, а не от сцены.
function origin() {
  return { x: img.offsetLeft + img.offsetWidth / 2, y: img.offsetTop + img.offsetHeight / 2 };
}

// Не даём увести изображение за край: сдвиг ограничен «лишним» размером.
function clampShift(shift, size, center, room) {
  const lo = Math.min(0, room - center - size / 2);
  const hi = Math.max(0, size / 2 - center);
  return Math.min(hi, Math.max(lo, shift));
}

function setView(scale, x, y) {
  const s = Math.min(MAX, Math.max(MIN, scale));
  const o = origin();
  view.scale = s;
  view.x = clampShift(x, img.offsetWidth * s, o.x, stage.clientWidth);
  view.y = clampShift(y, img.offsetHeight * s, o.y, stage.clientHeight);
  apply();
}

// Приблизить так, чтобы точка (px, py) экрана осталась под курсором/пальцами.
function zoomAt(scale, px, py) {
  const r = stage.getBoundingClientRect();
  const o = origin();
  const cx = px - (r.left + o.x);
  const cy = py - (r.top + o.y);
  const s = Math.min(MAX, Math.max(MIN, scale));
  const k = s / view.scale;
  setView(s, cx - (cx - view.x) * k, cy - (cy - view.y) * k);
}

function onWheel(e) {
  e.preventDefault();
  zoomAt(view.scale * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
}

function onDouble(e) {
  if (view.scale > 1) reset();
  else zoomAt(DOUBLE, e.clientX, e.clientY);
}

// --- жесты: перетаскивание, щипок, свайп -----------------------------

function wirePointers() {
  const pts = new Map();
  let start = null;   // { x, y, vx, vy } — начало перетаскивания/свайпа
  let pinch = null;   // { dist, scale }
  let moved = false;
  // С pointer capture браузер шлёт click на .viewer-stage, даже если нажали
  // на изображение, — поэтому «клик по фону» определяем по pointerdown.
  let downOnBackdrop = false;

  const dist = () => {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...pts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  stage.addEventListener('pointerdown', (e) => {
    downOnBackdrop = e.target === stage;
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* синтетический указатель */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pts.size === 1) start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    if (pts.size === 2) { pinch = { dist: dist(), scale: view.scale }; start = null; }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const m = mid();
      zoomAt(pinch.scale * (dist() / pinch.dist), m.x, m.y);
      moved = true;
      return;
    }
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    if (view.scale > 1) setView(view.scale, start.vx + dx, start.vy + dy);
  });

  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (start && pts.size === 0 && view.scale === 1) {
      const dx = e.clientX - start.x;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(dx < 0 ? 1 : -1);
    }
    if (pts.size === 0) start = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // Клик мимо изображения при обычном масштабе закрывает просмотрщик.
  stage.addEventListener('click', (e) => {
    if (!moved && view.scale === 1 && downOnBackdrop) close();
  });
}

function onKey(e) {
  if (!box || box.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'Tab') {
    // фокус не уходит со слоя просмотрщика
    const list = qsa('.viewer-btn:not([hidden])', box);
    const i = list.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
    else if (!e.shiftKey && (i === -1 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
  }
}
