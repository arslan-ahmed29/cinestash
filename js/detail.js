/* ░░ detail.js — movie detail modal ░░ */

import { details, poster, backdrop } from './api.js';
import { getLogFor, getAllLogsFor, toggleWatchlist, toggleFavorite, isWatchlisted, isFavorite } from './storage.js';
import { openModal, closeModal, toast, starsHtml, esc } from './ui.js';
import { openLogForm } from './logform.js';

export async function openDetail(movie) {
  // open immediately with a loader + basic info while we fetch full details
  openModal(skeletonHtml(movie));
  bindClose();

  let m = movie;
  try {
    m = await details(movie.id);
  } catch {
    /* fall back to the slim data we already have */
  }
  renderDetail(m);
}

function renderDetail(m) {
  const logged = getLogFor(m.id);
  const allLogs = getAllLogsFor(m.id);
  const wl = isWatchlisted(m.id);
  const fav = isFavorite(m.id);
  const imgP = m.poster  ? poster(m.poster, 'w342') : '';
  const imgB = m.backdrop ? backdrop(m.backdrop) : '';

  const loggedBlock = logged ? `
    <div class="detail__logged">
      <div class="detail__logged-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        In your stash${allLogs.length > 1 ? ` · ${allLogs.length}× watched` : ''}
      </div>
      ${logged.rating ? `<div class="detail__logged-stars">${starsHtml(logged.rating)}</div>` : ''}
      ${logged.review ? `<div class="detail__logged-review">${esc(logged.review)}</div>` : ''}
      <div class="detail__logged-date">Watched ${fmt(logged.watchedDate)}</div>
    </div>` : '';

  const genreChips = (m.genres || []).map(g => `<span class="chip">${esc(g)}</span>`).join('');
  const ratingChip = m.voteAverage ? `<span class="chip chip--rating">★ ${m.voteAverage.toFixed(1)}</span>` : '';
  const yearChip  = m.year ? `<span class="chip">${esc(m.year)}</span>` : '';
  const rtChip    = m.runtime ? `<span class="chip">${m.runtime} min</span>` : '';
  const dirChip   = m.director ? `<span class="chip">Dir. ${esc(m.director)}</span>` : '';

  document.getElementById('modalPanel').innerHTML = `
    <div class="detail__hero">
      <div class="detail__backdrop" style="${imgB ? `background-image:url('${imgB}')` : ''}"></div>
      <button class="detail__close" id="detailClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="detail__top">
        <div class="detail__poster" style="${imgP ? `background-image:url('${imgP}')` : ''}"></div>
        <div class="detail__info">
          <h2 class="detail__title">${esc(m.title)}</h2>
          ${m.tagline ? `<div class="detail__tagline">"${esc(m.tagline)}"</div>` : ''}
          <div class="detail__facts">
            ${yearChip}${ratingChip}${rtChip}${dirChip}${genreChips}
          </div>
          <div class="detail__actions">
            <button class="btn btn--primary" id="detailLog">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg>
              ${logged ? 'Edit log' : 'Log film'}
            </button>
            <button class="btn ${wl ? 'btn--gold' : ''}" id="detailWl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" style="width:16px;height:16px"><path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z"/></svg>
              ${wl ? 'Saved' : 'Watchlist'}
            </button>
            <button class="btn ${fav ? 'btn--gold' : ''}" id="detailFav">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
              ${fav ? 'Favorited' : 'Favorite'}
            </button>
          </div>
          ${loggedBlock}
        </div>
      </div>
    </div>
    <div class="detail__body">
      ${m.overview ? `<p class="detail__overview">${esc(m.overview)}</p>` : ''}
      ${m.cast?.length ? `<div style="margin-top:16px;color:var(--faint);font-size:13px;">Cast: ${m.cast.map(esc).join(', ')}</div>` : ''}
    </div>`;

  bindClose();
  document.getElementById('detailLog')?.addEventListener('click', () => {
    closeModal();
    openLogForm(m, logged);
  });
  document.getElementById('detailWl')?.addEventListener('click', e => {
    const added = toggleWatchlist(m);
    const btn = e.currentTarget;
    if (added) {
      btn.classList.add('btn--gold');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" style="width:16px;height:16px"><path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z"/></svg> Saved`;
      toast('Added to watchlist', '🔖');
    } else {
      btn.classList.remove('btn--gold');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" style="width:16px;height:16px"><path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z"/></svg> Watchlist`;
      toast('Removed from watchlist', '🗑');
    }
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });
  document.getElementById('detailFav')?.addEventListener('click', e => {
    const result = toggleFavorite(m);
    if (result === 'full') { toast('Favorites full (max 8)', '⚠️'); return; }
    const btn = e.currentTarget;
    if (result) {
      btn.classList.add('btn--gold');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg> Favorited`;
      toast('Added to favorites ◆', '⭐');
    } else {
      btn.classList.remove('btn--gold');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:16px;height:16px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg> Favorite`;
      toast('Removed from favorites', '✓');
    }
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });
}

function skeletonHtml(m) {
  const imgP = m.poster ? `${`https://image.tmdb.org/t/p/w342`}${m.poster}` : '';
  return `
    <div class="detail__hero">
      <div class="detail__backdrop" style="background-color:#16162a"></div>
      <button class="detail__close" id="detailClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="detail__top">
        <div class="detail__poster skeleton" style="${imgP ? `background-image:url('${imgP}')` : ''}"></div>
        <div class="detail__info">
          <h2 class="detail__title">${esc(m.title)}</h2>
          <div class="detail__facts"><span class="chip">${m.year || ''}</span></div>
          <div style="margin-top:18px" class="loader__ring" style="width:28px;height:28px"></div>
        </div>
      </div>
    </div>
    <div class="detail__body"><div class="loader"><div class="loader__ring"></div></div></div>`;
}

function bindClose() {
  document.getElementById('detailClose')?.addEventListener('click', closeModal);
}

function fmt(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  } catch { return dateStr; }
}
