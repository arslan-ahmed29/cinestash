/* ░░ pages/theaters.js — In Theaters & showtimes by ZIP + radius ░░
   No device location / GPS permission. You type a ZIP and pick a radius;
   showtimes open in Google for that ZIP and the "Theaters near me" map view
   is zoomed to roughly match your radius (ZIP is geocoded, not your device). */

import { inTheaters } from '../api.js?v=cb1';
import { loaderHtml, esc, toast } from '../ui.js?v=cb1';
import { openDetail } from '../detail.js?v=cb1';
import { getSettings, updateSettings } from '../storage.js?v=cb1';

const RADII = [5, 10, 25, 50];

/* session location derived from the typed ZIP */
let zip    = '';
let radius = 25;
let coords = null; // { lat, lng } once the ZIP is geocoded

export async function renderTheaters(app) {
  const s = getSettings();
  zip    = (s.zip || '').trim();
  radius = RADII.includes(s.radius) ? s.radius : 25;
  coords = (s.lat != null && s.lng != null) ? { lat: s.lat, lng: s.lng } : null;

  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">In Theaters</h1>
    <p class="page-head__sub" id="theaterSub">${zip ? subText(zip, radius) : 'Enter your ZIP code to find showtimes near you'}</p>

    <form class="zip-bar" id="zipForm" autocomplete="off">
      <div class="field" style="margin:0">
        <label class="field__label" for="zipInput">ZIP code</label>
        <input class="input zip-bar__zip" id="zipInput" type="text" inputmode="numeric" maxlength="5"
               pattern="[0-9]{5}" placeholder="e.g. 90210" value="${esc(zip)}" />
      </div>
      <div class="field" style="margin:0">
        <label class="field__label" for="radiusSelect">Within</label>
        <select class="input zip-bar__radius" id="radiusSelect">
          ${RADII.map(r => `<option value="${r}" ${r === radius ? 'selected' : ''}>${r} miles</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn--primary" id="zipSaveBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:15px;height:15px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Set location
      </button>
      <a class="btn btn--tinted zip-bar__map" id="theatersMapBtn" target="_blank" rel="noopener"
         href="${theatersMapUrl()}" style="${zip ? '' : 'display:none'}">
        Theaters near me
      </a>
    </form>
  </div>

  <div id="theatersContent" style="margin-top:14px">${loaderHtml}</div>`;

  document.getElementById('zipForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const v = (document.getElementById('zipInput').value || '').replace(/\D/g, '').slice(0, 5);
    const r = parseInt(document.getElementById('radiusSelect').value, 10) || 25;
    if (v.length !== 5) { toast('Enter a 5-digit ZIP code', '⚠️'); return; }

    zip = v; radius = r; coords = null;
    updateSettings({ zip, radius, lat: null, lng: null });
    document.getElementById('theaterSub').textContent = subText(zip, radius);
    refreshLinks();
    toast(`Showtimes set to ${zip}`, '📍');

    /* geocode the ZIP (free, no key, no GPS permission) so radius can zoom the map */
    coords = await geocodeZip(zip);
    if (coords) updateSettings({ lat: coords.lat, lng: coords.lng });
    refreshLinks();
  });

  /* changing radius re-tunes links/map immediately when a ZIP is already set */
  document.getElementById('radiusSelect')?.addEventListener('change', e => {
    radius = parseInt(e.target.value, 10) || 25;
    if (zip) {
      updateSettings({ radius });
      document.getElementById('theaterSub').textContent = subText(zip, radius);
      refreshLinks();
    }
  });

  /* films */
  let movies = [];
  try { movies = await inTheaters(); } catch { movies = []; }

  const content = document.getElementById('theatersContent');
  content?.querySelector('.loader')?.remove();

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
    if (e.target.closest('.theater-card__showtimes')) return; // let the link open
    const card = e.target.closest('.theater-card[data-movie-id]');
    if (card) openDetail({ id: card.dataset.movieId, title: card.dataset.title, year: card.dataset.year, poster: card.dataset.poster });
  });
}

/* ── Helpers ───────────────────────────────────────── */
function subText(z, r) {
  return `Showtimes near ${z} · within ${r} miles`;
}

async function geocodeZip(z) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(z)}&country=us&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const j = await res.json();
    if (Array.isArray(j) && j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch { /* fall back to text search */ }
  return null;
}

function refreshLinks() {
  document.querySelectorAll('.theater-card__showtimes').forEach(a => {
    const title = a.closest('.theater-card')?.dataset.title || '';
    a.href = showtimesUrl(title);
  });
  const mapBtn = document.getElementById('theatersMapBtn');
  if (mapBtn) { mapBtn.href = theatersMapUrl(); mapBtn.style.display = zip ? '' : 'none'; }
}

function showtimesUrl(title) {
  const where  = zip ? ` near ${zip}` : ' near me';
  const within = (zip && radius) ? ` within ${radius} miles` : '';
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} showtimes${where}${within}`)}`;
}

function theatersMapUrl() {
  const zoom = radius >= 50 ? 9 : radius >= 25 ? 10 : radius >= 10 ? 11 : 12;
  if (coords) return `https://www.google.com/maps/search/movie+theaters/@${coords.lat},${coords.lng},${zoom}z`;
  if (zip)    return `https://www.google.com/maps/search/${encodeURIComponent(`movie theaters near ${zip}`)}`;
  return 'https://www.google.com/maps/search/movie+theaters+near+me';
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="width:14px;height:14px"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
        Showtimes
      </a>
    </div>
  </div>`;
}
