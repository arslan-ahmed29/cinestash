/* ░░ pages/search.js — Full search results page ░░ */

import { search as apiSearch } from '../api.js';
import { cardHtml, loaderHtml, esc } from '../ui.js';
import { bindCardEvents } from './home.js';

export async function renderSearch(app, query) {
  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">Results for "${esc(query)}"</h1>
    <p class="page-head__sub">Searching TMDB…</p>
  </div>
  ${loaderHtml}`;

  try {
    const movies = await apiSearch(query);
    const sub = document.querySelector('.page-head__sub');
    if (sub) sub.textContent = `${movies.length} film${movies.length !== 1 ? 's' : ''} found`;

    const loader = app.querySelector('.loader');
    if (loader) loader.remove();

    if (!movies.length) {
      app.insertAdjacentHTML('beforeend', `
        <div class="empty fade-in">
          <div class="empty__icon">🔍</div>
          <div class="empty__title">No results found</div>
          <div class="empty__text">Try different keywords or check the spelling.</div>
        </div>`);
      return;
    }

    app.insertAdjacentHTML('beforeend', `
      <div class="grid fade-in" id="searchGrid">
        ${movies.map(m => cardHtml(m)).join('')}
      </div>`);

    bindCardEvents(app);
  } catch (e) {
    const loader = app.querySelector('.loader');
    if (loader) loader.remove();
    const msg = e.code === 'NO_KEY' ? 'Add your TMDB API key in Settings to search.'
              : e.code === 'BAD_KEY' ? 'Invalid TMDB API key — check Settings.'
              : 'Search failed. Check your connection.';
    app.insertAdjacentHTML('beforeend', `
      <div class="empty fade-in">
        <div class="empty__icon">⚠️</div>
        <div class="empty__title">Can't search</div>
        <div class="empty__text">${esc(msg)}</div>
      </div>`);
  }
}
