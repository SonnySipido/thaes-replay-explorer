'use strict';
(() => {
  function revealGuide(hash, scroll = false) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const guide = target?.matches('.guide-article')
      ? target.querySelector('.guide-disclosure')
      : target?.closest('.guide-disclosure');
    if (!guide) return;
    guide.open = true;
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start', behavior: 'instant'}));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealGuide(link.hash);
  });
  window.addEventListener('hashchange', () => revealGuide(location.hash, true));
  if (location.hash) revealGuide(location.hash, true);
})();
