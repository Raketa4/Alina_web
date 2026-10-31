// Единый (кэшируемый) доступ к data/site.json.

import { getJSON } from './util.js';

let cache = null;

export function getSite() {
  if (!cache) cache = getJSON('data/site.json').catch(() => ({}));
  return cache;
}

// Ссылки .js-contact-email и .js-contact-telegram — на почту и Telegram для связи
// из site.json (email, contact_telegram). В разметке те же адреса — на случай без JS.
export async function fillContactLinks() {
  const site = await getSite();
  if (site.email) {
    document.querySelectorAll('.js-contact-email').forEach((a) => {
      a.href = `mailto:${site.email}`;
      a.textContent = site.email;
    });
  }
  if (site.contact_telegram) {
    document.querySelectorAll('.js-contact-telegram').forEach((a) => { a.href = site.contact_telegram; });
  }
  return site;
}
