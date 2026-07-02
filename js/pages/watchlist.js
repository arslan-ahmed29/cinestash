/* ░░ pages/watchlist.js ░░ */

import { getWatchlist, toggleWatchlist, isWatchlisted } from '../storage.js?v=cb2';
import { cardHtml, toast } from '../ui.js?v=cb2';
import { bindCardEvents } from './home.js?v=cb2';
import { openSearchPicker } from '../searchpicker.js?v=cb2';

export function renderWatchlist(app) {
  const list = getWatchlist();

  app.innerHTML = `
  <div class="page-head page-head--row fade-in">
    <div>
      <h1 class="page-head__title">Watchlist</h1>
      <p class="page-head__sub">${list.length} film${list.length !== 1 ? 's' : ''} waiting to be watched</p>
    </div>
    <button class="add-btn" id="addToWatchlistBtn" aria-label="Add a film to watchlist" title="Add a film">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  </div>
  ${list.length ? `
  <div class="grid fade-in" id="watchlistGrid">
    ${list.map(m => cardHtml(m)).join('')}
  </div>` : emptyState()}`;

  bindCardEvents(app);

  document.getElementById('addToWatchlistBtn')?.addEventListener('click', () => {
    openSearchPicker({
      title: 'Add to Watchlist',
      hint: 'Search a film to save for later…',
      onPick: (movie) => {
        if (isWatchlisted(movie.id)) { toast(`"${movie.title}" is already on your watchlist`, '🔖'); return; }
        toggleWatchlist(movie);
        toast(`"${movie.title}" added to watchlist`, '🔖');
        window.dispatchEvent(new CustomEvent('cinestash:change'));
      },
    });
  });
}

function emptyState() {
  return `<div class="empty fade-in">
    <div class="empty__icon">🔖</div>
    <div class="empty__title">Nothing saved yet</div>
    <div class="empty__text">Find a film with the search bar and hit the watchlist button to save it for later.</div>
  </div>`;
}
