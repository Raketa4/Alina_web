// Контакты: почта и Telegram для связи — из data/site.json (fillContactLinks).
// Форма отправляется обычным POST в FormSubmit; после отправки он
// возвращает на contacts.html?sent=1 — показываем благодарность.

import { qs, param } from './util.js';
import { fillContactLinks } from './site.js';

export async function initContacts() {
  const site = await fillContactLinks();
  const form = qs('#contact-form');
  if (form && site.email) form.action = `https://formsubmit.co/${site.email}`;
  if (param('sent') === '1') qs('#form-sent')?.removeAttribute('hidden');
}
