/* ░░ storage.js — localStorage data layer for CINESTASH ░░
   Everything the user owns lives here: profile, logs, watchlist, favorites,
   and the TMDB api key. No backend needed → perfect for GitHub Pages. */

const KEY = 'cinestash:v1';

const DEFAULTS = () => ({
  profile: {
    username: 'Cinephile',
    handle: 'you',
    bio: 'Building my stash, one film at a time.',
    avatar: '',          // data URL or remote URL
    background: '',       // banner image (data URL / remote URL)
  },
  settings: {
    tmdbKey: '',          // user's TMDB v3 API key
  },
  logs: [],               // [{ id, movie, rating, review, watchedDate, loggedAt, rewatch }]
  watchlist: [],          // [{ ...movie, addedAt }]
  favorites: [],          // [ movieId, ... ] ordered, max 8
  favoriteMovies: {},     // { movieId: movie }  (cache so favorites render offline)
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS(), ...parsed,
      profile:  { ...DEFAULTS().profile,  ...(parsed.profile  || {}) },
      settings: { ...DEFAULTS().settings, ...(parsed.settings || {}) },
    };
  } catch {
    return DEFAULTS();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('CINESTASH: could not save', e);
  }
  window.dispatchEvent(new CustomEvent('cinestash:change'));
}

/* ── reads ─────────────────────────────────────────── */
export const get = () => state;
export const getProfile = () => state.profile;
export const getSettings = () => state.settings;
export const getLogs = () => [...state.logs].sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate));
export const getRecentLogs = () => [...state.logs].sort((a, b) => b.loggedAt - a.loggedAt);
export const getWatchlist = () => [...state.watchlist].sort((a, b) => b.addedAt - a.addedAt);
export const getFavorites = () => state.favorites.map(id => state.favoriteMovies[id]).filter(Boolean);

export const isWatchlisted = (id) => state.watchlist.some(m => m.id === id);
export const isFavorite = (id) => state.favorites.includes(id);
export const getLogFor = (id) => getRecentLogs().find(l => l.movie.id === id) || null;
export const getAllLogsFor = (id) => getRecentLogs().filter(l => l.movie.id === id);

export const stats = () => {
  const films = new Set(state.logs.map(l => l.movie.id)).size;
  const thisYear = new Date().getFullYear();
  const yearCount = state.logs.filter(l => new Date(l.watchedDate).getFullYear() === thisYear).length;
  return {
    total: state.logs.length,
    films,
    thisYear: yearCount,
    watchlist: state.watchlist.length,
  };
};

/* ── writes ────────────────────────────────────────── */
export function updateProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  persist();
}

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persist();
}

export function logMovie(movie, { rating, review, watchedDate, rewatch = false, editId = null }) {
  if (editId) {
    const existing = state.logs.find(l => l.id === editId);
    if (existing) {
      Object.assign(existing, { rating, review, watchedDate, rewatch });
      persist();
      return existing;
    }
  }
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    movie: slimMovie(movie),
    rating, review, watchedDate, rewatch,
    loggedAt: Date.now(),
  };
  state.logs.push(entry);
  // logging removes it from the watchlist automatically
  state.watchlist = state.watchlist.filter(m => m.id !== movie.id);
  persist();
  return entry;
}

export function deleteLog(logId) {
  state.logs = state.logs.filter(l => l.id !== logId);
  persist();
}

export function toggleWatchlist(movie) {
  if (isWatchlisted(movie.id)) {
    state.watchlist = state.watchlist.filter(m => m.id !== movie.id);
    persist();
    return false;
  }
  state.watchlist.push({ ...slimMovie(movie), addedAt: Date.now() });
  persist();
  return true;
}

export function toggleFavorite(movie) {
  const id = movie.id;
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter(f => f !== id);
    delete state.favoriteMovies[id];
    persist();
    return false;
  }
  if (state.favorites.length >= 8) {
    return 'full';
  }
  state.favorites.push(id);
  state.favoriteMovies[id] = slimMovie(movie);
  persist();
  return true;
}

export function reorderFavorites(orderedIds) {
  state.favorites = orderedIds.filter(id => state.favoriteMovies[id]);
  persist();
}

/* keep only what we need to render cards — keeps storage tiny */
function slimMovie(m) {
  return {
    id: m.id,
    title: m.title,
    year: m.year || (m.release_date ? m.release_date.slice(0, 4) : ''),
    poster: m.poster || m.poster_path || '',
    backdrop: m.backdrop || m.backdrop_path || '',
    voteAverage: m.voteAverage ?? m.vote_average ?? null,
    overview: m.overview || '',
  };
}

/* ── import / export (backup) ──────────────────────── */
export function exportData() {
  return JSON.stringify(state, null, 2);
}
export function importData(json) {
  const parsed = JSON.parse(json);
  state = { ...DEFAULTS(), ...parsed };
  persist();
}
export function wipe() {
  state = DEFAULTS();
  persist();
}
