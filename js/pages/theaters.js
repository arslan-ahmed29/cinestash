/* ░░ pages/theaters.js — In Theaters & real nearby theaters by ZIP + radius ░░
   No device location / GPS permission. You type a ZIP and pick a radius;
   the ZIP is geocoded (Nominatim, free/no key) to lat/lng, then actual
   cinemas near that point are pulled from OpenStreetMap (Overpass API,
   free/no key) and listed in-app — not just a link out to Google. */

import { inTheaters } from '../api.js?v=cb3';
import { loaderHtml, esc, toast } from '../ui.js?v=cb3';
import { openDetail } from '../detail.js?v=cb3';
import { getSettings, updateSettings } from '../storage.js?v=cb3';

const RADII = [5, 10, 25, 50];
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

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

  <div id="nearbyTheatersSection" style="margin-top:20px"></div>
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
    loadNearbyTheaters();
  });

  /* changing radius re-tunes links/map immediately when a ZIP is already set */
  document.getElementById('radiusSelect')?.addEventListener('change', e => {
    radius = parseInt(e.target.value, 10) || 25;
    if (zip) {
      updateSettings({ radius });
      document.getElementById('theaterSub').textContent = subText(zip, radius);
      refreshLinks();
      loadNearbyTheaters();
    }
  });

  /* if we already have a saved ZIP+coords, list real nearby theaters right away */
  if (zip && coords) loadNearbyTheaters();
  else if (zip && !coords) {
    /* have a ZIP but never geocoded it (older save) — geocode then load */
    geocodeZip(zip).then(c => {
      if (c) { coords = c; updateSettings({ lat: c.lat, lng: c.lng }); refreshLinks(); loadNearbyTheaters(); }
    });
  }

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

/* ── Real nearby theaters (OpenStreetMap Overpass, free, no key) ──── */
async function loadNearbyTheaters() {
  const el = document.getElementById('nearbyTheatersSection');
  if (!el || !coords) return;

  el.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:12px">Theaters Near You</h2>
    <div class="loader" style="padding:32px 0"><div class="loader__ring"></div></div>`;

  let venues = [];
  try {
    venues = await fetchNearbyTheaters(coords.lat, coords.lng, radius);
  } catch { venues = null; }

  if (venues === null) {
    el.innerHTML = `
      <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:12px">Theaters Near You</h2>
      <div class="empty" style="padding:32px 16px">
        <div class="empty__icon">🗺️</div>
        <div class="empty__title">Couldn't load nearby theaters</div>
        <div class="empty__text">Try the "Theaters near me" map link above instead.</div>
      </div>`;
    return;
  }

  if (!venues.length) {
    el.innerHTML = `
      <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:12px">Theaters Near You</h2>
      <div class="empty" style="padding:32px 16px">
        <div class="empty__icon">🍿</div>
        <div class="empty__title">No theaters found within ${radius} miles</div>
        <div class="empty__text">Try a bigger radius above.</div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:12px">Theaters Near You</h2>
    <div class="venues fade-in">${venues.map(venueCard).join('')}</div>`;
}

async function fetchNearbyTheaters(lat, lng, radiusMiles) {
  const meters = Math.round(Math.min(radiusMiles, 50) * 1609.34);
  const query = `[out:json][timeout:20];(node["amenity"="cinema"](around:${meters},${lat},${lng});way["amenity"="cinema"](around:${meters},${lat},${lng}););out center tags;`;

  let json = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
      if (!res.ok) continue;
      json = await res.json();
      break;
    } catch { /* try next mirror */ }
  }
  if (!json) throw new Error('Overpass unreachable');

  const venues = (json.elements || [])
    .map(el => {
      const t = el.tags || {};
      const vlat = el.lat ?? el.center?.lat;
      const vlng = el.lon ?? el.center?.lon;
      if (vlat == null || vlng == null || !t.name) return null;
      return {
        name: t.name,
        address: formatAddress(t),
        lat: vlat, lng: vlng,
        distanceMi: haversineMiles(lat, lng, vlat, vlng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, 15);

  return venues;
}

function formatAddress(t) {
  const parts = [
    [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
    t['addr:city'], t['addr:state'], t['addr:postcode'],
  ].filter(Boolean);
  return parts.join(', ');
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function venueCard(v) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;
  const showtimesUrlV = `https://www.google.com/search?q=${encodeURIComponent(`${v.name} showtimes`)}`;
  return `
  <div class="venue-card">
    <div class="venue-card__body">
      <div class="venue-card__name">${esc(v.name)}</div>
      <div class="venue-card__meta">${v.distanceMi.toFixed(1)} mi away${v.address ? ` · ${esc(v.address)}` : ''}</div>
    </div>
    <div class="venue-card__actions">
      <a class="btn btn--sm btn--primary" href="${showtimesUrlV}" target="_blank" rel="noopener">Showtimes</a>
      <a class="btn btn--sm btn--tinted" href="${directionsUrl}" target="_blank" rel="noopener">Directions</a>
    </div>
  </div>`;
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
