'use strict';
(() => {
  const animations = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function setExpanded(article, expanded) {
    if (article.classList.contains('is-collapsed') === !expanded) return;
    const body = article.querySelector('.guide-body');
    const start = body.getBoundingClientRect().height;
    animations.get(body)?.cancel();
    article.classList.toggle('is-collapsed', !expanded);
    article.querySelector('.guide-toggle').setAttribute('aria-expanded', String(expanded));
    if (!reducedMotion.matches) {
      const animation = body.animate([
        {height: start + 'px'},
        {height: body.getBoundingClientRect().height + 'px'}
      ], {duration: 240, easing: 'ease-out'});
      animation.id = 'guide-expand-collapse';
      animations.set(body, animation);
    }
  }
  document.querySelectorAll('.guide-article').forEach(article => {
    article.addEventListener('click', event => {
      if (event.target.closest('a, button, input, select, textarea, label') && !event.target.closest('.guide-toggle')) return;
      setExpanded(article, article.classList.contains('is-collapsed'));
    });
    // Reveal clipped links before keyboard focus reaches them.
    article.addEventListener('focusin', event => {
      if (event.target.closest('.guide-body')) setExpanded(article, true);
    });
  });
  function revealGuide(hash, scroll = false) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const article = target?.closest('.guide-article');
    if (!article) return;
    setExpanded(article, true);
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start', behavior: 'instant'}));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealGuide(link.hash);
  });
  window.addEventListener('hashchange', () => revealGuide(location.hash, true));
  if (location.hash) revealGuide(location.hash, true);
})();
