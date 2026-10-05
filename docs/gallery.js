'use strict';
(() => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll('figure')];
  const dots = [...gallery.querySelectorAll('[data-slide]')];
  const viewport = gallery.querySelector('.screenshots');
  let current = 0;
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    gallery.querySelector('.slide-status').textContent = (current + 1) + ' / ' + slides.length;
  }
  gallery.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => show(current + Number(button.dataset.step))));
  dots.forEach(button => button.addEventListener('click', () => show(Number(button.dataset.slide))));
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.closest('figure')) viewport.focus();
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  show(0);
  gallery.querySelector('.slider-controls').hidden = false;
})();
