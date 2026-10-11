'use strict';
(() => {
  const links = [...document.querySelectorAll('.screenshots figure > a, .guide-figure > a')];
  if (!links.length) return;

  const viewer = document.createElement('dialog');
  viewer.className = 'screenshot-viewer';
  viewer.setAttribute('aria-labelledby', 'screenshot-viewer-title');
  viewer.setAttribute('aria-describedby', 'screenshot-viewer-position');
  viewer.innerHTML = '<div class="screenshot-viewer-toolbar"><h2 id="screenshot-viewer-title">Screenshot</h2><span id="screenshot-viewer-position" class="screenshot-viewer-position" aria-live="polite" aria-atomic="true"></span><button type="button" class="screenshot-zoom" aria-pressed="false">Zoom in</button><button type="button" class="screenshot-close" aria-label="Close screenshot">Close <span aria-hidden="true">&times;</span></button></div><div class="screenshot-viewer-content"><button type="button" class="screenshot-previous" aria-label="Previous screenshot" title="Previous screenshot (Left arrow)">&larr;</button><div class="screenshot-viewer-stage"><img class="screenshot-viewer-image" alt=""></div><button type="button" class="screenshot-next" aria-label="Next screenshot" title="Next screenshot (Right arrow)">&rarr;</button></div>';
  document.body.append(viewer);
  const image = viewer.querySelector('img');
  const stage = viewer.querySelector('.screenshot-viewer-stage');
  const zoom = viewer.querySelector('.screenshot-zoom');
  const close = viewer.querySelector('.screenshot-close');
  const title = viewer.querySelector('h2');
  const position = viewer.querySelector('.screenshot-viewer-position');
  const previous = viewer.querySelector('.screenshot-previous');
  const next = viewer.querySelector('.screenshot-next');
  let current = 0;
  let opener;

  function fit() {
    stage.classList.remove('is-zoomed');
    zoom.textContent = 'Zoom in';
    zoom.setAttribute('aria-pressed', 'false');
    image.title = 'Zoom in';
    stage.scrollTo(0, 0);
  }
  function toggleZoom() {
    if (stage.classList.contains('is-zoomed')) return fit();
    const width = Math.max(image.naturalWidth, image.getBoundingClientRect().width * 2);
    image.style.setProperty('--screenshot-zoom-width', width + 'px');
    stage.classList.add('is-zoomed');
    zoom.textContent = 'Fit to screen';
    zoom.setAttribute('aria-pressed', 'true');
    image.title = 'Fit to screen';
  }
  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    title.textContent = link.closest('figure').querySelector('figcaption h3')?.textContent || 'Screenshot';
    position.textContent = (current + 1) + ' / ' + links.length;
    fit();
    const gallery = link.closest('.gallery');
    const picker = gallery?.querySelector('#screenshot-picker');
    if (picker) {
      opener = link;
      picker.value = String([...gallery.querySelectorAll('.screenshots figure > a')].indexOf(link));
      picker.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
  previous.disabled = next.disabled = links.length < 2;
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  zoom.addEventListener('click', toggleZoom);
  image.addEventListener('click', toggleZoom);
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('screenshot-viewer-open');
    fit();
    opener?.focus({preventScroll: true});
  });
  links.forEach((link, index) => {
    const thumbnail = link.querySelector('img');
    if (!thumbnail) return;
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(index);
      viewer.showModal();
      document.documentElement.classList.add('screenshot-viewer-open');
      close.focus({preventScroll: true});
    });
  });
})();
