/* ░░ api.js — Free IMDb API (no key required) ░░
   https://imdb.iamidiotareyoutoo.com
   Search: GET /search?q=<title>
   Detail: GET /search?tt=tt0468569
   Response: { ok, description: [{ imdbId, "#TITLE", "#YEAR", "#IMG_POSTER",
               "#IMDb_SHORT_DESC", "#STORY_LINE", genre }] }
*/

const BASE = 'https://imdb.iamidiotareyoutoo.com';

/* always true — no key needed */
export const hasKey = () => true;

/* poster/backdrop: this API returns full URLs already */
export const poster   = (url) => url || '';
export const backdrop = (url) => url || '';

/* normalize a raw API result into the shape the app uses */
export function normalize(m) {
  return {
    id:          m.imdbId || '',
    title:       m['#TITLE']        || m.title    || 'Untitled',
    year:        String(m['#YEAR']  || m.year     || ''),
    poster:      m['#IMG_POSTER']   || m.poster   || '',
    backdrop:    '',   /* not provided by this API */
    voteAverage: null,
    overview:    m['#IMDb_SHORT_DESC'] || m['#STORY_LINE'] || m.description || '',
    runtime:     null,
    genres:      Array.isArray(m.genre) ? m.genre : [],
    tagline:     '',
    director:    '',
    cast:        [],
    imdbUrl:     m['#IMDB_URL'] || `https://www.imdb.com/title/${m.imdbId}/`,
  };
}

async function apiFetch(params) {
  const url = new URL(`${BASE}/search`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  if (!json.ok && !json.description) throw new Error(json.description || 'API error');
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

export async function trending() {
  return fetchCuratedList(POPULAR_IDS.slice(0, 10));
}

async function fetchCuratedList(ids) {
  /* check cache first */
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
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

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: movies, ts: Date.now(), ids })); } catch {}
  return movies;
}
