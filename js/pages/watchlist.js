/* ░░ pages/watchlist.js ░░ */

import { getWatchlist } from '../storage.js';
import { cardHtml } from '../ui.js';
import { bindCardEvents } from './home.js';

export function renderWatchlist(app) {
  const list = getWatchlist();

  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">Watchlist</h1>
    <p class="page-head__sub">${list.length} film${list.length !== 1 ? 's' : ''} waiting to be watched</p>
  </div>
  ${list.length ? `
  <div class="grid fade-in" id="watchlistGrid">
    ${list.map(m => cardHtml(m)).join('')}
  </div>` : emptyState()}`;

  bindCardEvents(app);
}

function emptyState() {
  return `<div class="empty fade-in">
    <div class="empty__icon">🔖</div>
    <div class="empty__title">Nothing saved yet</div>
    <div class="empty__text">Find a film with the search bar and hit the watchlist button to save it for later.</div>
  </div>`;
}
