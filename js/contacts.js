// Контакты: почта и Telegram для связи берутся из data/site.json
// (email, contact_telegram). В разметке те же адреса — на случай без JS.
// Форма отправляется обычным POST в FormSubmit; после отправки он
// возвращает на contacts.html?sent=1 — показываем благодарность.

import { qs, qsa, param } from './util.js';
import { getSite } from './site.js';

export async function initContacts() {
  const site = await getSite();

  if (site.email) {
    qsa('.js-contact-email').forEach((a) => {
      a.href = `mailto:${site.email}`;
      a.textContent = site.email;
    });
    const form = qs('#contact-form');
    if (form) form.action = `https://formsubmit.co/${site.email}`;
  }
  if (site.contact_telegram) {
    qsa('.js-contact-telegram').forEach((a) => { a.href = site.contact_telegram; });
  }
  if (param('sent') === '1') qs('#form-sent')?.removeAttribute('hidden');
}
