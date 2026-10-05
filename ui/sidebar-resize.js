'use strict';
(() => {
 const workspace = document.querySelector('.workspace');
 const pane = document.getElementById('library-pane');
 const divider = document.getElementById('library-resizer');
 const key = 'replay-list-width', defaultWidth = 365;
 const saved = Number(localStorage.getItem(key));
 let preferred = Number.isFinite(saved) && saved >= defaultWidth ? saved : defaultWidth;
 let drag = null;
 function limits() {
  const available = workspace.clientWidth;
  return {min: Math.min(defaultWidth, available), max: Math.max(Math.min(defaultWidth, available), available - 620)};
 }
 function apply(width = preferred) {
  const {min,max} = limits();
  const actual = Math.round(Math.max(min, Math.min(max, width)));
  workspace.style.setProperty('--library-width', actual + 'px');
  divider.setAttribute('aria-valuemin', String(min));
  divider.setAttribute('aria-valuemax', String(max));
  divider.setAttribute('aria-valuenow', String(actual));
  divider.setAttribute('aria-valuetext', actual + ' pixels');
  return actual;
 }
 function save(width) {
  preferred = apply(width);
  localStorage.setItem(key, String(preferred));
 }
 function finish(event) {
  if (!drag || (event && event.pointerId !== undefined && event.pointerId !== drag.id)) return;
  const id = drag.id;
  drag = null;
  document.body.classList.remove('resizing-library');
  save(pane.getBoundingClientRect().width);
  if (divider.hasPointerCapture(id)) divider.releasePointerCapture(id);
 }
 divider.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  divider.focus();
  drag = {id:event.pointerId, x:event.clientX, width:pane.getBoundingClientRect().width};
  divider.setPointerCapture(event.pointerId);
  document.body.classList.add('resizing-library');
 });
 divider.addEventListener('pointermove', event => {
  if (drag && event.pointerId === drag.id) apply(drag.width + event.clientX - drag.x);
 });
 divider.addEventListener('pointerup', finish);
 divider.addEventListener('pointercancel', finish);
 divider.addEventListener('lostpointercapture', finish);
 window.addEventListener('blur', () => finish());
 divider.addEventListener('dblclick', () => save(defaultWidth));
 divider.addEventListener('keydown', event => {
  const {min,max} = limits();
  const width = pane.getBoundingClientRect().width;
  const step = event.shiftKey ? 50 : 10;
  const values = {ArrowLeft:width-step, ArrowRight:width+step, Home:min, End:max};
  if (!(event.key in values)) return;
  event.preventDefault();
  save(values[event.key]);
 });
 new ResizeObserver(() => { if (!drag) apply(); }).observe(workspace);
 apply();
})();
