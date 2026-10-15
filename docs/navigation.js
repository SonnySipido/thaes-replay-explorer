'use strict';
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'site-page-transition';
  const root = document.documentElement;
  let leaving = false;
  let arriving = false;

  try {
    const pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    sessionStorage.removeItem(storageKey);
    if (pending?.path === location.pathname && Date.now() - pending.time < 15000 && !reducedMotion.matches) {
      arriving = true;
      root.classList.add('page-arriving');
    }
  } catch {}

  function reveal() {
    if (!reducedMotion.matches) {
      const animation = document.body.animate([{opacity: 0}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
      animation.id = 'site-page-enter';
    }
    root.classList.remove('page-arriving');
  }
  if (arriving) {
    document.addEventListener('DOMContentLoaded', async () => {
      // Let the other page scripts finish initializing and avoid a font/image pop.
      const visibleImages = [...document.images].filter(image => {
        const bounds = image.getBoundingClientRect();
        return bounds.width > 0 && bounds.top < innerHeight && bounds.bottom > 0;
      });
      await Promise.race([
        Promise.all([document.fonts.ready, ...visibleImages.map(image => image.decode().catch(() => {}))]),
        new Promise(resolve => setTimeout(resolve, 600))
      ]);
      reveal();
    }, {once: true});
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    const page = destination.pathname.split('/').pop();
    if (destination.origin !== location.origin || !['', 'index.html', 'guides.html'].includes(page) || destination.pathname === location.pathname || reducedMotion.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({path: destination.pathname, time: Date.now()}));
    } catch {}
    const animation = document.body.animate([{opacity: 1}, {opacity: 0}], {duration: 160, easing: 'ease-in', fill: 'forwards'});
    animation.id = 'site-page-leave';
    animation.finished.then(() => location.assign(destination.href));
  });

  // A page restored from the back/forward cache must be visible again.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    document.body.getAnimations().filter(animation => animation.id.startsWith('site-page-')).forEach(animation => animation.cancel());
    reveal();
  });
})();
