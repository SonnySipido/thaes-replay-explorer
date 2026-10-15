'use strict';
(() => {
  document.querySelectorAll('.gallery-toggle, .feature-toggle').forEach(toggle => {
    const card = toggle.closest('.gallery, .feature-list');
    card.addEventListener('click', event => {
      // Screenshot links and gallery controls keep their own actions.
      if (event.target.closest('a, button, input, select, textarea, label') && !event.target.closest('.gallery-toggle, .feature-toggle')) return;
      const expanded = card.classList.contains('is-collapsed');
      card.classList.toggle('is-collapsed', !expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
    });
  });
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll('figure')];
  const picker = gallery.querySelector('#screenshot-picker');
  const viewport = gallery.querySelector('.screenshots');
  let current = 0;
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    picker.value = String(current);
    gallery.querySelector('.slide-status').textContent = (current + 1) + ' / ' + slides.length;
  }
  gallery.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => show(current + Number(button.dataset.step))));
  picker.addEventListener('change', () => show(Number(picker.value)));
  gallery.addEventListener('keydown', event => {
    if (event.target.closest('select')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.closest('figure')) viewport.focus();
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  show(0);
  gallery.querySelector('.slider-controls').hidden = false;
})();
