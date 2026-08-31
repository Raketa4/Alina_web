// Контакты: прямые ссылки из data/site.json и форма, собирающая
// письмо через mailto (при отсутствии e-mail — ведёт в Telegram).

import { qs, getLang, pick, escapeHtml } from './util.js';
import { getSite } from './site.js';
import { t } from './i18n.js';

export async function initContacts() {
  const wrap = qs('#contact-direct');
  const form = qs('#contact-form');
  if (!wrap && !form) return;

  const lang = getLang();
  const site = await getSite();
  const social = site.social || {};

  if (wrap) {
    const rows = [];
    if (site.email) {
      rows.push(item(t('contacts.emailLabel'), site.email, `mailto:${site.email}`));
    } else {
      rows.push(`<li><span class="work-sub">${escapeHtml(t('contacts.emailLabel'))}</span><br>${escapeHtml(t('contacts.emailPending'))}</li>`);
    }
    if (social.telegram) rows.push(item(t('contacts.telegramLabel'), '@alinakhoniak', social.telegram));
    if (site.location) {
      rows.push(`<li><span class="work-sub">${escapeHtml(t('contacts.studioLabel'))}</span><br>${escapeHtml(pick(site.location, lang))}</li>`);
    }

    const socialLinks = ['instagram', 'vk', 'behance', 'facebook']
      .filter((k) => social[k])
      .map((k) => `<a href="${escapeHtml(social[k])}">${cap(k)}</a>`)
      .join(' · ');

    wrap.innerHTML = `
      <div>
        <p class="footer-col-title">${escapeHtml(t('contacts.directTitle'))}</p>
        <ul>${rows.join('')}</ul>
      </div>
      ${socialLinks ? `<div><p class="footer-col-title">${escapeHtml(t('contacts.socialTitle'))}</p><p>${socialLinks}</p></div>` : ''}`;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const contact = (fd.get('contact') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();

      const body = `${message}\n\n— ${name}\n${contact}`;
      if (site.email) {
        const subject = t('inquiry.subjectGeneral');
        location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else if (social.telegram) {
        location.href = social.telegram;
      }
    });
  }
}

function item(label, text, href) {
  return `<li><span class="work-sub">${escapeHtml(label)}</span><br><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></li>`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
