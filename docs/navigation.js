'use strict';
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'site-page-transition';
  const root = document.documentElement;
  let leaving = false;

  try {
    const pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    sessionStorage.removeItem(storageKey);
    if (pending?.path === location.pathname && Date.now() - pending.time < 5000 && !reducedMotion.matches) {
      const animation = root.animate([
        {opacity: 0, transform: 'translateY(6px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 180, easing: 'ease-out'});
      animation.id = 'site-page-enter';
    }
  } catch {}

  document.addEventListener('click', event => {
    const link = event.target.closest('.site-tabs a');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname || reducedMotion.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({path: destination.pathname, time: Date.now()}));
    } catch {}
    const animation = root.animate([
      {opacity: 1, transform: 'translateY(0)'},
      {opacity: 0, transform: 'translateY(-6px)'}
    ], {duration: 140, easing: 'ease-in', fill: 'forwards'});
    animation.id = 'site-page-leave';
    animation.finished.then(() => location.assign(destination.href));
  });

  // A page restored from the back/forward cache must be visible again.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    root.getAnimations().filter(animation => animation.id.startsWith('site-page-')).forEach(animation => animation.cancel());
  });
})();
