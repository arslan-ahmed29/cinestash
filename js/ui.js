/* ░░ ui.js — shared render helpers ░░ */

import { poster, backdrop } from './api.js?v=cb1';
import { isWatchlisted, isFavorite, getLogFor } from './storage.js?v=cb1';

/* ── toast ─────────────────────────────────────────── */
let toastTimer;
export function toast(msg, icon = '✓', duration = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = `<span class="toast__icon">${icon}</span> ${msg}`;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), duration);
}

/* ── modal ─────────────────────────────────────────── */
const modal = document.getElementById('modal');
const modalPanel = document.getElementById('modalPanel');

export function openModal(html) {
  modalPanel.innerHTML = html;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalPanel.innerHTML = '';
}

modal.querySelector('[data-close]')?.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── star rendering ─────────────────────────────────── */
export function starsHtml(rating, max = 5) {
  if (!rating && rating !== 0) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 1; i <= max; i++) {
    if (i <= full) s += '★';
    else if (i === full + 1 && half) s += '½';
    else s += '☆';
  }
  return s;
}

/* ── movie card ─────────────────────────────────────── */
export function cardHtml(movie, { rank, lazy = true } = {}) {
  const p = movie.poster ? poster(movie.poster) : '';
  const logged = getLogFor(movie.id);
  const wl = isWatchlisted(movie.id);
  const fav = isFavorite(movie.id);

  const rating = logged?.rating;
  const stars = rating ? starsHtml(rating) : '';

  return `
  <div class="card" data-movie-id="${movie.id}" data-poster="${esc(p)}" role="button" tabindex="0" aria-label="${esc(movie.title)}">
    <div class="card__poster${p ? '' : ' card__poster--empty skeleton'}"
      style="${p ? `background-image:url('${p}')` : ''}">
      ${rank != null ? `<div class="card__rank">${rank}</div>` : ''}
      ${rating ? `<div class="card__badge"><span class="star">★</span>${rating}</div>` : ''}
      <div class="card__overlay">
        ${stars ? `<div class="card__stars">${stars}</div>` : ''}
        <div class="card__quick">
          <button class="card__log-btn" data-id="${movie.id}" data-action="log" aria-label="Log film">
            ${logged ? '✎ Edit' : '+ Log'}
          </button>
          <button class="card__wl-btn ${wl ? 'is-wl' : ''}" data-id="${movie.id}" data-action="watchlist" aria-label="${wl ? 'Remove from watchlist' : 'Add to watchlist'}">
            ${wl ? '🔖' : '＋'}
          </button>
        </div>
      </div>
      ${p ? '' : `<div style="padding:10px;text-align:center;color:var(--faint);font-size:13px;">${esc(movie.title)}</div>`}
    </div>
    <div class="card__title">${esc(movie.title)}</div>
    <div class="card__sub">${movie.year || ''}${fav ? ' ◆' : ''}</div>
  </div>`;
}

/* ── carousel wrapper ───────────────────────────────── */
export function carouselHtml(id, cards) {
  if (!cards.length) return '';
  return `
  <div class="carousel" id="${id}">
    <button class="carousel__nav carousel__nav--prev" aria-label="Scroll left">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div class="carousel__track">${cards.join('')}</div>
    <button class="carousel__nav carousel__nav--next" aria-label="Scroll right">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </div>`;
}

export function attachCarouselNav(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const track = wrap.querySelector('.carousel__track');
  wrap.querySelector('.carousel__nav--prev')?.addEventListener('click', () => {
    track.scrollBy({ left: -520, behavior: 'smooth' });
  });
  wrap.querySelector('.carousel__nav--next')?.addEventListener('click', () => {
    track.scrollBy({ left: 520, behavior: 'smooth' });
  });
}

/* ── escape helper ──────────────────────────────────── */
export function esc(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── image file → data URL ──────────────────────────── */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ── loader html ────────────────────────────────────── */
export const loaderHtml = `<div class="loader"><div class="loader__ring"></div></div>`;
