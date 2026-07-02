/* ░░ api.js — Free IMDb API (no key required) ░░
   Primary:  https://search.imdbot.workers.dev  (Cloudflare Worker — has CORS)
   Fallback: https://imdb.iamidiotareyoutoo.com via corsproxy.io
   Search: GET /?q=<title>      Detail: GET /?tt=tt0468569
   Response: { ok, description: [{ "#IMDB_ID", "#TITLE", "#YEAR", "#IMG_POSTER",
               "#ImDb_SHORT_DESC", "#STORY_LINE", "#GENRE" }] }
*/

const PRIMARY = 'https://search.imdbot.workers.dev';
const FALLBACK_BASE = 'https://imdb.iamidiotareyoutoo.com';
const PROXY = 'https://corsproxy.io/?url=';

/* always true — no key needed */
export const hasKey = () => true;

/* poster/backdrop: this API returns full URLs already */
export const poster   = (url) => url || '';
export const backdrop = (url) => url || '';

/* normalize a raw API result into the shape the app uses */
export function normalize(m) {
  const id = m['#IMDB_ID'] || m.imdbId || '';
  return {
    id,
    title:       m['#TITLE']           || m.title       || 'Untitled',
    year:        String(m['#YEAR']     || m.year        || ''),
    poster:      m['#IMG_POSTER']      || m.poster      || '',
    backdrop:    '',
    voteAverage: null,
    overview:    m['#ImDb_SHORT_DESC'] || m['#STORY_LINE'] || m['#IMDb_SHORT_DESC'] || m.description || '',
    runtime:     null,
    genres:      Array.isArray(m['#GENRE']) ? m['#GENRE'] : Array.isArray(m.genre) ? m.genre : [],
    tagline:     '',
    director:    '',
    cast:        [],
    imdbUrl:     m['#IMDB_URL'] || (id ? `https://www.imdb.com/title/${id}/` : ''),
  };
}

async function tryFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiFetch(params) {
  /* Build the primary URL (Cloudflare Worker — CORS enabled) */
  const primary = new URL(PRIMARY);
  Object.entries(params).forEach(([k, v]) => primary.searchParams.set(k, v));

  /* Try primary → fallback via CORS proxy */
  let json;
  try {
    json = await tryFetch(primary.toString());
  } catch {
    const fallback = new URL(`${FALLBACK_BASE}/search`);
    Object.entries(params).forEach(([k, v]) => fallback.searchParams.set(k, v));
    json = await tryFetch(`${PROXY}${encodeURIComponent(fallback.toString())}`);
  }

  if (!json.ok && !json.description) throw new Error('API error');
  return json;
}

export async function search(query) {
  if (!query.trim()) return [];
  const json = await apiFetch({ q: query });
  const results = json.description;
  if (!Array.isArray(results)) return [];
  return results.map(normalize).filter(m => m.id && m.title);
}

export async function details(id) {
  /* id is an IMDb tt string like "tt0468569" */
  const json = await apiFetch({ tt: id });
  const results = json.description;
  if (!Array.isArray(results) || !results.length) throw new Error('Not found');
  /* find the exact match, or fall back to first result */
  const match = results.find(r => r.imdbId === id) || results[0];
  return normalize(match);
}

/* ── Popular / Trending ──────────────────────────────────────────── */
/* Since the API has no trending endpoint, we fetch a curated list
   of well-known films in parallel and cache in sessionStorage.     */

const POPULAR_IDS = [
  'tt0468569', // The Dark Knight
  'tt1375666', // Inception
  'tt0816692', // Interstellar
  'tt0111161', // The Shawshank Redemption
  'tt0068646', // The Godfather
  'tt0137523', // Fight Club
  'tt6751668', // Parasite
  'tt0109830', // Forrest Gump
  'tt0050083', // 12 Angry Men
  'tt0245429', // Spirited Away
  'tt0993846', // The Wolf of Wall Street
  'tt1853728', // Django Unchained
  'tt0482571', // The Prestige
  'tt2582802', // Whiplash
  'tt0317248', // City of God
  'tt1853728', // Django Unchained
  'tt0372784', // Batman Begins
  'tt0133093', // The Matrix
  'tt0120737', // The Fellowship of the Ring
  'tt4154796', // Avengers: Endgame
];

const CACHE_KEY = 'cinestash:popular_v1';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function popular() {
  return fetchCuratedList(POPULAR_IDS.slice(0, 12));
}

/* weeks since the epoch — used to rotate "this week" deterministically */
function weekIndex() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

/* "Trending This Week" — auto-populated and self-refreshing.
   We blend current theatrical releases with popular catalog titles, then
   rotate the 12-title window by the current week so it changes on its own. */
export async function trending() {
  const pool = [...new Set([...THEATER_IDS, ...POPULAR_IDS])];
  const offset  = (weekIndex() * 5) % pool.length;
  const rotated = pool.slice(offset).concat(pool.slice(0, offset));
  const ids = rotated.slice(0, 12);
  return fetchCuratedList(ids, `cinestash:trending_w${weekIndex()}`);
}

async function fetchCuratedList(ids, cacheKey = CACHE_KEY) {
  /* check cache first */
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts, ids: cachedIds } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL && JSON.stringify(cachedIds) === JSON.stringify(ids)) {
        return data;
      }
    }
  } catch {}

  /* fetch all in parallel, ignore failures */
  const settled = await Promise.allSettled(ids.map(id => details(id)));
  const movies  = settled
    .filter(r => r.status === 'fulfilled' && r.value?.id)
    .map(r => r.value);

  try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: movies, ts: Date.now(), ids })); } catch {}
  return movies;
}

/* ── In Theaters / Coming Soon ───────────────────────────────────── */
/* This free API has no showtimes endpoint, so we surface a curated set
   of recent + upcoming theatrical releases. Each film links out to a
   Google "showtimes near me" search that uses the user's own location. */

const THEATER_IDS = [
  'tt30057084', // Wicked: For Good
  'tt27003788', // Materialists
  'tt31193180', // Sinners
  'tt28607951', // Mickey 17
  'tt11655566', // Thunderbolts*
  'tt18259086', // Superman (2025)
  'tt31036941', // 28 Years Later
  'tt22022452', // F1
  'tt9603208',  // Mission: Impossible — The Final Reckoning
  'tt24871974', // A Minecraft Movie
  'tt19847976', // Captain America: Brave New World
  'tt23468450', // How to Train Your Dragon (2025)
];

const THEATER_CACHE_KEY = 'cinestash:theaters_v1';

export async function inTheaters() {
  const ids = [...new Set(THEATER_IDS)];
  return fetchCuratedList(ids, THEATER_CACHE_KEY);
}
