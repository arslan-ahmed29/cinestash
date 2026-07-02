/* ░░ searchpicker.js — modal to find a film and do something with it ░░ */

import { search } from './api.js?v=cb2';
import { openModal, closeModal, esc } from './ui.js?v=cb2';

/* opens a search modal; calls onPick(movie) when a result is chosen */
export function openSearchPicker({ title = 'Add a film', hint = 'Search every film ever made…', onPick } = {}) {
  openModal(`
  <div class="dialog">
    <h2 class="dialog__title">${esc(title)}</h2>
    <div class="picker-search">
      <svg class="picker-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input class="input picker-search__input" id="pickerInput" type="search" placeholder="${esc(hint)}" autocomplete="off" autofocus>
    </div>
    <div class="picker-results" id="pickerResults">
      <div class="picker-hint">Start typing to find a film.</div>
    </div>
    <div style="margin-top:18px;text-align:right">
      <button class="btn btn--ghost" id="pickerCloseBtn">Cancel</button>
    </div>
  </div>`);

  const input   = document.getElementById('pickerInput');
  const results = document.getElementById('pickerResults');
  let debounce, lastQuery = '', movies = [];

  document.getElementById('pickerCloseBtn')?.addEventListener('click', closeModal);
  setTimeout(() => input?.focus(), 60);

  input?.addEventListener('input', () => {
    const q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(debounce);
    if (!q) { results.innerHTML = '<div class="picker-hint">Start typing to find a film.</div>'; return; }
    results.innerHTML = '<div class="loader" style="padding:32px 0"><div class="loader__ring"></div></div>';
    debounce = setTimeout(async () => {
      try {
        const found = await search(q);
        if (input.value.trim() !== q) return;
        movies = found;
        renderResults(found, q);
      } catch {
        results.innerHTML = '<div class="picker-hint">Search failed — check your connection.</div>';
      }
    }, 300);
  });

  function renderResults(list, q) {
    if (!list.length) {
      results.innerHTML = `<div class="picker-hint">No films found for "${esc(q)}".</div>`;
      return;
    }
    results.innerHTML = list.slice(0, 12).map((m, i) => `
      <div class="picker-row" data-idx="${i}" role="button" tabindex="0">
        <div class="picker-row__poster" style="${m.poster ? `background-image:url('${m.poster}')` : 'background-color:var(--fill)'}"></div>
        <div class="picker-row__info">
          <div class="picker-row__title">${esc(m.title)}</div>
          <div class="picker-row__year">${m.year || '—'}</div>
        </div>
        <span class="picker-row__add">＋</span>
      </div>`).join('');
  }

  results?.addEventListener('click', e => {
    const row = e.target.closest('.picker-row');
    if (!row) return;
    const movie = movies[parseInt(row.dataset.idx)];
    if (movie && onPick) onPick(movie);
  });
  results?.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('picker-row')) {
      e.preventDefault();
      const movie = movies[parseInt(e.target.dataset.idx)];
      if (movie && onPick) onPick(movie);
    }
  });
}
