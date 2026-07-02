/* ░░ hamzahtracker.js — draggable "how late was Hamzah" meter ░░
   A 🚗 you drag along a road to log how late Hamzah showed up. */

import { setHamzahLate } from './storage.js';

const LABELS = [
  { max: 4,   text: 'Right on time 🎬' },
  { max: 24,  text: 'Strolled in during trailers' },
  { max: 49,  text: 'Missed the opening scene' },
  { max: 74,  text: 'Missed act one' },
  { max: 94,  text: 'Practically watched the sequel' },
  { max: 100, text: 'Reported MIA 💀' },
];

function labelFor(val) {
  return (LABELS.find(l => val <= l.max) || LABELS[LABELS.length - 1]).text;
}

export function hamzahTrackerHtml(logId, value = 0) {
  const v = Math.max(0, Math.min(100, value));
  return `
  <div class="hamzah-tracker" data-log-id="${logId}">
    <div class="hamzah-tracker__head">
      <span class="hamzah-tracker__title">🚗 Hamzah-o-meter</span>
      <span class="hamzah-tracker__value" data-hamzah-value>${labelFor(v)}</span>
    </div>
    <div class="hamzah-tracker__track" data-track tabindex="-1">
      <div class="hamzah-tracker__road"></div>
      <div class="hamzah-tracker__car" data-car style="left:${v}%"
           role="slider" tabindex="0" aria-label="How late was Hamzah to this movie"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}">🚗</div>
    </div>
    <div class="hamzah-tracker__ticks">
      <span>On time</span><span>Fashionably late</span><span>MIA</span>
    </div>
  </div>`;
}

export function bindHamzahTrackers(root = document) {
  root.querySelectorAll('.hamzah-tracker').forEach(bindOne);
}

function bindOne(el) {
  const logId   = el.dataset.logId;
  const track   = el.querySelector('[data-track]');
  const car     = el.querySelector('[data-car]');
  const valueEl = el.querySelector('[data-hamzah-value]');
  if (!track || !car) return;

  function apply(v, persist) {
    v = Math.max(0, Math.min(100, v));
    car.style.left = `${v}%`;
    car.setAttribute('aria-valuenow', String(v));
    if (valueEl) valueEl.textContent = labelFor(v);
    if (persist) setHamzahLate(logId, v);
  }

  function pctFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return 0;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  let dragging = false;

  car.addEventListener('pointerdown', e => {
    dragging = true;
    car.classList.add('is-dragging');
    car.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  car.addEventListener('pointermove', e => {
    if (!dragging) return;
    apply(pctFromClientX(e.clientX), false);
  });
  function release(e) {
    if (!dragging) return;
    dragging = false;
    car.classList.remove('is-dragging');
    apply(pctFromClientX(e.clientX), true);
  }
  car.addEventListener('pointerup', release);
  car.addEventListener('pointercancel', release);

  /* tap/click anywhere on the road to jump the car there */
  track.addEventListener('click', e => {
    if (e.target === car) return;
    apply(pctFromClientX(e.clientX), true);
  });

  /* keyboard control */
  car.addEventListener('keydown', e => {
    const cur = parseFloat(car.style.left) || 0;
    if (e.key === 'ArrowRight') { e.preventDefault(); apply(cur + 5, true); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); apply(cur - 5, true); }
    else if (e.key === 'Home')       { e.preventDefault(); apply(0, true); }
    else if (e.key === 'End')        { e.preventDefault(); apply(100, true); }
  });
}
