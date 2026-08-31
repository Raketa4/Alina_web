// Общие утилиты. ES-модуль, без зависимостей.

export const SUPPORTED_LANGS = ['ru', 'en'];

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function getLang() {
  const lang = document.documentElement.lang;
  return SUPPORTED_LANGS.includes(lang) ? lang : 'ru';
}

// Достаёт строку нужного языка из значения вида { ru, en } либо возвращает как есть.
export function pick(value, lang = getLang()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] ?? value.ru ?? '';
  }
  return value ?? '';
}

// "Заявка: «{title}», {year}" + { title, year } -> подставляет значения.
export function fillTemplate(str, data = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (data[key] ?? ''));
}

// Строит URL текущей страницы с изменёнными query-параметрами.
export function urlWithParams(changes) {
  const url = new URL(location.href);
  Object.entries(changes).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') url.searchParams.delete(key);
    else url.searchParams.set(key, val);
  });
  return url;
}

export function param(name) {
  return new URL(location.href).searchParams.get(name);
}
