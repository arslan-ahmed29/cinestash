/* ░░ pages/theaters.js — In Theaters & showtimes near you ░░ */

import { inTheaters } from '../api.js';
import { loaderHtml, esc } from '../ui.js';
import { openDetail } from '../detail.js';

/* cached location for this session */
let userCity = '';
let userLat  = null;
let userLng  = null;

export async function renderTheaters(app) {
  app.innerHTML = `
  <div class="page-head page-head--row fade-in">
    <div>
      <h1 class="page-head__title">In Theaters</h1>
      <p class="page-head__sub" id="theaterSub">Tap "Showtimes" to find screenings near you</p>
    </div>
    <button class="btn btn--primary" id="locateBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:15px;height:15px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      Use my location
    </button>
  </div>
  <div id="theatersContent" style="margin-top:8px">${loaderHtml}</div>`;

  document.getElementById('locateBtn')?.addEventListener('click', locate);

  /* if we already have location from a previous visit this session, restore it */
  if (userCity) updateLocationUI();

  let movies = [];
  try { movies = await inTheaters(); } catch { movies = []; }

  const content = document.getElementById('theatersContent');
  const loader  = content?.querySelector('.loader');
  if (loader) loader.remove();

  if (!movies.length) {
    content?.insertAdjacentHTML('beforeend', `
      <div class="empty fade-in">
        <div class="empty__icon">🍿</div>
        <div class="empty__title">Couldn't load releases</div>
        <div class="empty__text">Check your connection and try again.</div>
      </div>`);
    return;
  }

  content?.insertAdjacentHTML('beforeend', `
    <div class="theaters fade-in" id="theatersGrid">
      ${movies.map(theaterCard).join('')}
    </div>`);

  const grid = document.getElementById('theatersGrid');
  grid?.addEventListener('click', e => {
    if (e.target.closest('.theater-card__showtimes')) return;
    const card = e.target.closest('.theater-card[data-movie-id]');
    if (card) openDetail({ id: card.dataset.movieId, title: card.dataset.title, year: card.dataset.year, poster: card.dataset.poster });
  });
}

/* ── Geolocation ───────────────────────────────────── */
async function locate() {
  const btn = document.getElementById('locateBtn');
  if (!navigator.geolocation) { alert('Your browser doesn\'t support location access.'); return; }

  if (btn) { btn.textContent = 'Locating…'; btn.disabled = true; }

  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
    );
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;

    /* Reverse-geocode with OpenStreetMap Nominatim (free, no key, CORS ok) */
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geo = await r.json();
      userCity = geo.address?.city || geo.address?.town || geo.address?.suburb || geo.address?.county || '';
    } catch { userCity = ''; }

    updateLocationUI();
    updateShowtimeLinks();
  } catch {
    if (btn) { btn.textContent = 'Location denied'; btn.disabled = false; }
  }
}

function updateLocationUI() {
  const sub = document.getElementById('theaterSub');
  const btn = document.getElementById('locateBtn');
  if (sub) sub.textContent = userCity
    ? `Showing showtimes near ${userCity}`
    : 'Location set — showtimes links updated';
  if (btn) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:15px;height:15px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${userCity || 'Located'}`;
    btn.disabled = false;
    btn.classList.add('btn--tinted');
    btn.classList.remove('btn--primary');
  }
}

function updateShowtimeLinks() {
  document.querySelectorAll('.theater-card__showtimes').forEach(a => {
    const title = a.closest('.theater-card')?.dataset.title || '';
    a.href = showtimesUrl(title);
  });
}

function showtimesUrl(title) {
  const loc  = userCity || (userLat != null ? `${userLat.toFixed(4)},${userLng.toFixed(4)}` : '');
  const q    = `${title} showtimes${loc ? ' near ' + loc : ' near me'}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function theaterCard(m) {
  return `
  <div class="theater-card" data-movie-id="${m.id}" data-title="${esc(m.title)}" data-year="${esc(m.year)}" data-poster="${esc(m.poster || '')}" role="button" tabindex="0">
    <div class="theater-card__poster" style="${m.poster ? `background-image:url('${m.poster}')` : 'background-color:var(--fill)'}">
      ${m.poster ? '' : `<span class="theater-card__noimg">${esc(m.title)}</span>`}
    </div>
    <div class="theater-card__body">
      <div class="theater-card__title">${esc(m.title)}</div>
      <div class="theater-card__year">${m.year || ''}</div>
      ${m.overview ? `<p class="theater-card__overview">${esc(m.overview)}</p>` : ''}
      <a class="btn btn--primary btn--sm theater-card__showtimes" href="${showtimesUrl(m.title)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Showtimes
      </a>
    </div>
  </div>`;
}
