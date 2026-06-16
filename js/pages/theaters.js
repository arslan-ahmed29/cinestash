/* ░░ pages/theaters.js — In Theaters & showtimes near you ░░ */

import { inTheaters } from '../api.js';
import { loaderHtml, esc } from '../ui.js';
import { openDetail } from '../detail.js';

export async function renderTheaters(app) {
  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">In Theaters</h1>
    <p class="page-head__sub">Now showing & coming soon — tap “Showtimes” to find screenings near you</p>
  </div>
  ${loaderHtml}`;

  let movies = [];
  try {
    movies = await inTheaters();
  } catch {
    movies = [];
  }

  const loader = app.querySelector('.loader');
  if (loader) loader.remove();

  if (!movies.length) {
    app.insertAdjacentHTML('beforeend', `
      <div class="empty fade-in">
        <div class="empty__icon">🍿</div>
        <div class="empty__title">Couldn't load releases</div>
        <div class="empty__text">Check your connection and try again.</div>
      </div>`);
    return;
  }

  app.insertAdjacentHTML('beforeend', `
    <div class="theaters fade-in" id="theatersGrid">
      ${movies.map(theaterCard).join('')}
    </div>`);

  const grid = document.getElementById('theatersGrid');
  grid?.addEventListener('click', e => {
    /* let the showtimes link behave normally */
    if (e.target.closest('.theater-card__showtimes')) return;
    const card = e.target.closest('.theater-card[data-movie-id]');
    if (card) openDetail({ id: card.dataset.movieId, title: card.dataset.title, year: card.dataset.year, poster: card.dataset.poster });
  });
}

function theaterCard(m) {
  const q = encodeURIComponent(`${m.title} ${m.year || ''} showtimes near me`.trim());
  const showtimesUrl = `https://www.google.com/search?q=${q}`;
  return `
  <div class="theater-card" data-movie-id="${m.id}" data-title="${esc(m.title)}" data-year="${esc(m.year)}" data-poster="${esc(m.poster || '')}" role="button" tabindex="0">
    <div class="theater-card__poster" style="${m.poster ? `background-image:url('${m.poster}')` : 'background-color:var(--fill)'}">
      ${m.poster ? '' : `<span class="theater-card__noimg">${esc(m.title)}</span>`}
    </div>
    <div class="theater-card__body">
      <div class="theater-card__title">${esc(m.title)}</div>
      <div class="theater-card__year">${m.year || ''}</div>
      ${m.overview ? `<p class="theater-card__overview">${esc(m.overview)}</p>` : ''}
      <a class="btn btn--primary btn--sm theater-card__showtimes" href="${showtimesUrl}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Showtimes near me
      </a>
    </div>
  </div>`;
}
