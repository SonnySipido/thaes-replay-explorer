'use strict';
(() => {
  function setExpanded(article, expanded) {
    article.classList.toggle('is-collapsed', !expanded);
    article.querySelector('.guide-toggle').setAttribute('aria-expanded', String(expanded));
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
