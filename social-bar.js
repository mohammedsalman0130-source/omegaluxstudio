/* OMEGALUX Studio — fixed social links. Self-contained; no changes to page layout. */
(() => {
  'use strict';
  if (window.__omegaluxFloatingSocialLoaded) return;
  window.__omegaluxFloatingSocialLoaded = true;

  // Set this only after confirming the official company Instagram account URL.
  // Until then the Instagram tile remains visible but is not a misleading link.
  const INSTAGRAM_PROFILE_URL = '';
  // Uses the published business telephone number: +971 58 117 8675.
  const WHATSAPP_CHAT_URL = 'https://wa.me/971581178675?text=Hello%20OMEGALUX%20Studio%2C%20I%20would%20like%20to%20enquire%20about%20your%20lighting%20design%20and%20supply%20services.';

  const instagramSvg = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5.3"></rect><circle cx="12" cy="12" r="4.3"></circle><circle cx="17.8" cy="6.4" r="1.1" fill="currentColor" stroke="none"></circle></svg>';
  const whatsappSvg = '<svg viewBox="0 0 24 24" width="27" height="27" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.7 21.3l4.8-1.2A9.4 9.4 0 1 0 12 2.5Z"></path><path d="M8.6 7.5c-.4-.6-.8-.6-1.2 0-.5.7-.7 1.4-.4 2.2.7 2 3.1 4.4 5.2 5.1 1.4.5 2.3.5 3.4-.5.4-.4.3-.8-.2-1.1l-1.7-.9c-.3-.2-.6-.1-.8.2l-.6.7c-.2.2-.4.2-.8 0a9.7 9.7 0 0 1-2.9-2.8c-.2-.3-.2-.6 0-.8l.5-.6c.2-.2.2-.5.1-.8l-.6-.7Z" fill="currentColor" stroke="none"></path></svg>';

  function attachPanel() {
    if (document.getElementById('ol-floating-social-panel')) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/social-bar.css?v=20261117';
    document.head.appendChild(stylesheet);

    const panel = document.createElement('nav');
    panel.id = 'ol-floating-social-panel';
    panel.setAttribute('aria-label', 'OMEGALUX Studio social links');

    const links = [
      { network: 'instagram', name: 'Instagram', url: INSTAGRAM_PROFILE_URL, svg: instagramSvg },
      { network: 'whatsapp', name: 'WhatsApp chat', url: WHATSAPP_CHAT_URL, svg: whatsappSvg }
    ];

    for (const link of links) {
      const enabled = Boolean(link.url);
      const tile = document.createElement(enabled ? 'a' : 'span');
      tile.className = 'ol-social-tile ol-social-' + link.network;
      if (enabled) {
        tile.href = link.url;
        tile.target = '_blank';
        tile.rel = 'noopener noreferrer';
        tile.setAttribute('aria-label', 'Open OMEGALUX Studio ' + link.name);
        tile.title = link.name;
      } else {
        tile.setAttribute('aria-label', link.name + ' profile link pending');
        tile.setAttribute('aria-disabled', 'true');
        tile.title = link.name + ' — official profile link to be added';
      }
      const icon = document.createElement('span');
      icon.className = 'ol-social-icon';
      icon.innerHTML = link.svg;
      const label = document.createElement('span');
      label.className = 'ol-social-label';
      label.textContent = enabled ? link.name : link.name + ' · Soon';
      tile.append(icon, label);
      panel.appendChild(tile);
    }

    document.body.appendChild(panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachPanel, { once: true });
  } else {
    attachPanel();
  }
})();
