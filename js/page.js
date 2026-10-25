// Единая точка входа для каждой страницы: порядок инициализации
// (шапка/меню/подвал -> язык -> интерфейс -> контент страницы -> аналитика).

import { renderChrome } from './chrome.js';
import { initI18n } from './i18n.js';
import { initUI } from './ui.js';
import { initAnalytics } from './analytics.js';

export async function bootPage(pageInit) {
  await renderChrome();
  await initI18n();
  initUI();
  if (typeof pageInit === 'function') {
    try {
      await pageInit();
    } catch (err) {
      console.error('Ошибка инициализации страницы:', err);
    }
  }
  initAnalytics();
}
