// Единая точка входа для каждой страницы: порядок инициализации
// (язык -> интерфейс -> контент страницы -> аналитика).

import { initI18n } from './i18n.js';
import { initUI } from './ui.js';
import { initAnalytics } from './analytics.js';

export async function bootPage(pageInit) {
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
