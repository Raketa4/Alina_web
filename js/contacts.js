// Контакты: прямые ссылки из data/site.json и форма FormSubmit.
// Форма отправляется обычным POST; после отправки FormSubmit
// возвращает на contacts.html?sent=1 — показываем благодарность.

import { qs, param, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';

const SOCIAL = { telegram: 'Telegram', instagram: 'Instagram', vk: 'VK' };

export async function initContacts() {
  const site = await getSite();
  const social = site.social || {};

  const form = qs('#contact-form');
  if (form && site.email) form.action = `https://formsubmit.co/${site.email}`;
  if (param('sent') === '1') qs('#form-sent')?.removeAttribute('hidden');

  const wrap = qs('#contact-direct');
  if (!wrap) return;

  const links = Object.entries(SOCIAL)
    .filter(([key]) => social[key])
    .map(([key, label]) => `<li><a class="link" href="${escapeHtml(social[key])}" target="_blank" rel="noopener">${label}</a></li>`)
    .join('');

  wrap.innerHTML = `
    ${site.email ? `
      <div>
        <p class="eyebrow">${escapeHtml(t('contacts.emailLabel'))}</p>
        <a class="link" href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a>
      </div>` : ''}
    ${links ? `
      <div>
        <p class="eyebrow">${escapeHtml(t('contacts.socialTitle'))}</p>
        <ul>${links}</ul>
      </div>` : ''}`;
}
