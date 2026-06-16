/* ░░ api.js — TMDB access layer ░░
   "Every movie known to mankind" comes from The Movie Database (TMDB).
   The user supplies their own free API key (stored locally) so no secret
   ships in the repo. Supports both the classic v3 key and v4 bearer token. */

import { getSettings } from './storage.js';

const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p';

export const poster   = (path, size = 'w500') => path ? `${IMG}/${size}${path}` : '';
export const backdrop = (path, size = 'w1280') => path ? `${IMG}/${size}${path}` : '';

export function hasKey() {
  const k = getSettings().tmdbKey?.trim();
  return !!k;
}

function authedUrl(path, params = {}) {
  const key = getSettings().tmdbKey?.trim() || '';
  const url = new URL(BASE + path);
  // v4 tokens are long JWTs; v3 keys are short hex. Default to v3 query param.
  const isV4 = key.startsWith('eyJ') || key.length > 60;
  if (!isV4) url.searchParams.set('api_key', key);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  return { url: url.toString(), headers: isV4 ? { Authorization: `Bearer ${key}` } : {} };
}

async function call(path, params) {
  if (!hasKey()) {
    const err = new Error('NO_KEY');
    err.code = 'NO_KEY';
    throw err;
  }
  const { url, headers } = authedUrl(path, params);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(`TMDB ${res.status}`);
    err.code = res.status === 401 ? 'BAD_KEY' : 'HTTP';
    throw err;
  }
  return res.json();
}

/* normalise a TMDB movie into the shape the app uses everywhere */
export function normalize(m) {
  return {
    id: m.id,
    title: m.title || m.name || 'Untitled',
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    release_date: m.release_date,
    poster: m.poster_path || '',
    backdrop: m.backdrop_path || '',
    voteAverage: m.vote_average ?? null,
    overview: m.overview || '',
    runtime: m.runtime || null,
    genres: m.genres ? m.genres.map(g => g.name) : [],
    tagline: m.tagline || '',
    director: m.director || '',
    cast: m.cast || [],
  };
}

export async function search(query) {
  if (!query.trim()) return [];
  const data = await call('/search/movie', { query, include_adult: false });
  return (data.results || [])
    .filter(m => m.poster_path || m.release_date)
    .map(normalize);
}

export async function trending() {
  const data = await call('/trending/movie/week');
  return (data.results || []).map(normalize);
}

export async function popular() {
  const data = await call('/movie/popular');
  return (data.results || []).map(normalize);
}

export async function details(id) {
  const data = await call(`/movie/${id}`, { append_to_response: 'credits' });
  const m = normalize(data);
  if (data.credits) {
    const dir = data.credits.crew?.find(c => c.job === 'Director');
    m.director = dir ? dir.name : '';
    m.cast = (data.credits.cast || []).slice(0, 6).map(c => c.name);
  }
  return m;
}
