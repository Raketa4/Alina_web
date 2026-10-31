// Контакты: почта и Telegram для связи берутся из data/site.json
// (email, contact_telegram). В разметке те же адреса — на случай без JS.

import { qsa } from './util.js';
import { getSite } from './site.js';

export async function initContacts() {
  const site = await getSite();

  if (site.email) {
    qsa('.js-contact-email').forEach((a) => {
      a.href = `mailto:${site.email}`;
      a.textContent = site.email;
    });
  }
  if (site.contact_telegram) {
    qsa('.js-contact-telegram').forEach((a) => { a.href = site.contact_telegram; });
  }
}
