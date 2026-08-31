// Двуязычность: словари i18n/<lang>.json, применение по data-i18n,
// переключатель RU/EN в шапке. Смена языка = перезагрузка с ?lang=.

import { getJSON, qs, qsa, SUPPORTED_LANGS, urlWithParams } from './util.js';

const STORE_KEY = 'akh-lang';
let dict = {};

export function resolveLang() {
  const q = new URL(location.href).searchParams.get('lang');
  if (SUPPORTED_LANGS.includes(q)) return q;
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (_) { /* приватный режим */ }
  return 'ru';
}

// Достаёт строку по ключу "a.b.c"; если нет — возвращает сам ключ.
export function t(key) {
  const val = key.split('.').reduce((obj, part) => (obj == null ? obj : obj[part]), dict);
  return typeof val === 'string' ? val : key;
}

export async function initI18n() {
  const lang = resolveLang();
  document.documentElement.lang = lang;
  try {
    dict = await getJSON(`i18n/${lang}.json`);
  } catch (err) {
    console.warn('i18n: словарь не загружен', err);
    dict = {};
  }
  applyTranslations(document);
  wireLangSwitch(lang);
  try { localStorage.setItem(STORE_KEY, lang); } catch (_) { /* ignore */ }
  return lang;
}

// Применяет переводы к статической разметке.
// data-i18n="a.b"                     -> textContent
// data-i18n-attr="aria-label:a.b, title:c.d" -> setAttribute
export function applyTranslations(root = document) {
  qsa('[data-i18n]', root).forEach((node) => {
    const value = t(node.dataset.i18n);
    if (typeof value === 'string') node.textContent = value;
  });
  qsa('[data-i18n-attr]', root).forEach((node) => {
    node.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) node.setAttribute(attr, t(key));
    });
  });
}

function wireLangSwitch(current) {
  qsa('.lang-switch button[data-lang]').forEach((btn) => {
    const target = btn.dataset.lang;
    btn.setAttribute('aria-pressed', String(target === current));
    btn.addEventListener('click', () => {
      if (target === current) return;
      try { localStorage.setItem(STORE_KEY, target); } catch (_) { /* ignore */ }
      location.href = urlWithParams({ lang: target }).toString();
    });
  });
}
