/* ░░ logform.js — log / edit a film ░░ */

import { poster } from './api.js';
import { logMovie, deleteLog } from './storage.js';
import { openModal, closeModal, toast, esc } from './ui.js';

export function openLogForm(movie, existingLog = null) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = existingLog;
  const imgP = movie.poster ? poster(movie.poster, 'w154') : '';

  const html = `
  <div class="logform">
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px">
      ${imgP ? `<img src="${imgP}" alt="" style="width:64px;border-radius:10px;flex-shrink:0">` : ''}
      <div>
        <div class="logform__title">${esc(movie.title)}</div>
        <div class="logform__sub">${movie.year || ''} · ${existing ? 'Edit your log' : 'Log this film'}</div>
      </div>
    </div>

    <div class="field">
      <label class="field__label">Your rating</label>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="stars-input" id="starsInput" role="group" aria-label="Star rating">
          ${[1,2,3,4,5].map(i => `<span class="star${existing?.rating >= i ? ' on' : ''}" data-val="${i}" role="radio" aria-label="${i} star${i>1?'s':''}" tabindex="0">★</span>`).join('')}
        </div>
        <span class="stars-hint" id="starsHint">${ratingLabel(existing?.rating)}</span>
      </div>
      <input type="hidden" id="ratingVal" value="${existing?.rating || ''}">
    </div>

    <div class="field">
      <label class="field__label" for="watchedDate">Date watched</label>
      <input class="input" type="date" id="watchedDate" value="${existing?.watchedDate || today}" max="${today}">
    </div>

    <div class="field">
      <label class="field__label" for="reviewText">Review / notes <span style="color:var(--faint);font-weight:400">(optional)</span></label>
      <textarea class="textarea" id="reviewText" placeholder="What did you think?">${esc(existing?.review || '')}</textarea>
    </div>

    <div class="field" style="display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="rewatchCb" ${existing?.rewatch ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--brand)">
      <label for="rewatchCb" style="font-size:14px;color:var(--muted)">This was a rewatch</label>
    </div>

    <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">
      <button class="btn btn--primary" id="logSaveBtn" style="flex:1;min-width:140px">
        ${existing ? 'Save changes' : 'Add to Stash ◆'}
      </button>
      ${existing ? `<button class="btn" id="logDeleteBtn" style="color:var(--brand)">Delete log</button>` : ''}
      <button class="btn btn--ghost" id="logCancelBtn">Cancel</button>
    </div>
  </div>`;

  openModal(html);

  /* star interaction */
  let currentRating = existing?.rating || 0;
  const starsEl = document.getElementById('starsInput');
  const ratingInput = document.getElementById('ratingVal');
  const hint = document.getElementById('starsHint');

  function setStars(val) {
    currentRating = val;
    ratingInput.value = val;
    hint.textContent = ratingLabel(val);
    starsEl.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('on', i < val);
    });
  }

  starsEl.addEventListener('click', e => {
    const star = e.target.closest('[data-val]');
    if (!star) return;
    const val = parseInt(star.dataset.val);
    if (currentRating === val) setStars(0); // deselect on same star
    else setStars(val);
  });
  starsEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' && currentRating < 5) setStars(currentRating + 1);
    if (e.key === 'ArrowLeft'  && currentRating > 0) setStars(currentRating - 1);
  });

  /* save */
  document.getElementById('logSaveBtn')?.addEventListener('click', () => {
    const watchedDate = document.getElementById('watchedDate').value;
    const review      = document.getElementById('reviewText').value.trim();
    const rating      = parseFloat(ratingInput.value) || null;
    const rewatch     = document.getElementById('rewatchCb').checked;
    if (!watchedDate) { toast('Please add a watched date', '⚠️'); return; }
    logMovie(movie, { rating, review, watchedDate, rewatch, editId: existing?.id || null });
    closeModal();
    toast(existing ? 'Log updated' : `"${movie.title}" added to your stash ◆`, '🎬');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('logDeleteBtn')?.addEventListener('click', () => {
    if (!confirm('Delete this log entry?')) return;
    deleteLog(existing.id);
    closeModal();
    toast('Log deleted', '🗑');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('logCancelBtn')?.addEventListener('click', closeModal);
}

const LABELS = ['', 'Terrible', 'Bad', 'Decent', 'Good', 'Amazing'];
function ratingLabel(r) {
  return r ? `${LABELS[Math.floor(r)] || r} (${r}/5)` : 'No rating';
}
