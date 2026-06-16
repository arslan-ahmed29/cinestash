/* ░░ storage.js — localStorage data layer ░░ */

const KEY = 'cinestash:v1';

/* ── Seed data ──────────────────────────────────── */
/* Every hot take is Saqib's — your one resident hater. */
const SEED_TAKES = {
  'tt0468569': [
    { id:'s_dk_1', username:'saqib', text:"Heath Ledger only won the Oscar because he died. The Joker is just a guy doing a weird voice in clown makeup.", spice:4, agrees:12, disagrees:87, ts:1700000000000 },
    { id:'s_dk_2', username:'saqib', text:"The truck flip is literally the only impressive thing here. The rest is a Law & Order episode with a bigger budget.", spice:5, agrees:3, disagrees:201, ts:1700000001000 },
  ],
  'tt1375666': [
    { id:'s_inc_1', username:'saqib', text:"The top falls. Nobody cares. The real plot hole is that Leo's character is insufferable in literally every scene.", spice:3, agrees:44, disagrees:130, ts:1700000002000 },
    { id:'s_inc_2', username:'saqib', text:"Nolan made a movie about dreams where nothing actually feels dreamlike. It's just a heist movie for people who think they're smart.", spice:4, agrees:68, disagrees:220, ts:1700000003000 },
  ],
  'tt0137523': [
    { id:'s_fc_1', username:'saqib', text:"This movie is a manifesto for men who didn't get enough hugs. Brad Pitt is literally just wearing a leather jacket.", spice:4, agrees:22, disagrees:178, ts:1700000004000 },
    { id:'s_fc_2', username:'saqib', text:"The twist was obvious from the first 20 minutes. I've seen better mindf***s in an IKEA instruction manual.", spice:5, agrees:9, disagrees:312, ts:1700000005000 },
  ],
  'tt6751668': [
    { id:'s_par_1', username:'saqib', text:"Every critic gave this 10/10 because they were scared of being called racist if they didn't. It's good but calm down.", spice:5, agrees:8, disagrees:303, ts:1700000006000 },
    { id:'s_par_2', username:'saqib', text:"The ending ruins everything the first two hours built. Bong just rage quit his own screenplay.", spice:4, agrees:31, disagrees:145, ts:1700000007000 },
  ],
  'tt0816692': [
    { id:'s_int_1', username:'saqib', text:"Hans Zimmer turned the volume up to drown out McConaughey crying for three straight hours. The science is actual nonsense.", spice:3, agrees:91, disagrees:55, ts:1700000008000 },
    { id:'s_int_2', username:'saqib', text:"'Love is a dimension.' Christopher Nolan should be banned from writing dialogue forever.", spice:5, agrees:204, disagrees:88, ts:1700000009000 },
  ],
  'tt0068646': [
    { id:'s_gf_1', username:'saqib', text:"It's three hours of men whispering to each other about pasta. I get it. They're very serious. We know.", spice:3, agrees:19, disagrees:455, ts:1700000010000 },
  ],
  'tt0110912': [
    { id:'s_pf_1', username:'saqib', text:"People who say this is their favorite movie haven't seen more than 15 films in their life. It's film school bingo.", spice:4, agrees:37, disagrees:190, ts:1700000011000 },
  ],
};

const DEMO_FRIENDS = [
  {
    id: 'friend_saqib', username: 'saqib', displayName: 'Saqib',
    emoji: '🌶️',
    bio: 'Your resident hater. Every hot take in this app is mine. Fight me.',
    logs: [
      { movie:{ id:'tt0468569', title:'The Dark Knight', year:'2008', poster:'' }, rating:2, review:'Wildly overrated. A Law & Order episode with a Batman skin.', watchedDate:'2026-06-16' },
      { movie:{ id:'tt0816692', title:'Interstellar', year:'2014', poster:'' }, rating:1.5, review:'Three hours of mumbling under a wall of Hans Zimmer noise.', watchedDate:'2026-06-13' },
      { movie:{ id:'tt0110912', title:'Pulp Fiction', year:'1994', poster:'' }, rating:2.5, review:'Film-school bingo for people who own one Criterion disc.', watchedDate:'2026-06-09' },
    ],
  },
  {
    id: 'friend_01', username: 'marlowe', displayName: 'Marlowe Ashford',
    emoji: '🎭',
    bio: 'Horror devotee. Will defend Rob Zombie\'s Halloween to the grave.',
    logs: [
      { movie:{ id:'tt0468569', title:'The Dark Knight', year:'2008', poster:'' }, rating:4.5, review:'Still holds up.', watchedDate:'2026-06-14' },
      { movie:{ id:'tt1375666', title:'Inception', year:'2010', poster:'' }, rating:3, review:'Overrated but I get it.', watchedDate:'2026-06-10' },
    ],
  },
  {
    id: 'friend_02', username: 'sofia_reels', displayName: 'Sofia Navarro',
    emoji: '🎬',
    bio: 'Criterion stans rise up. No CGI ever.',
    logs: [
      { movie:{ id:'tt6751668', title:'Parasite', year:'2019', poster:'' }, rating:5, review:'Absolute masterpiece.', watchedDate:'2026-06-15' },
      { movie:{ id:'tt0068646', title:'The Godfather', year:'1972', poster:'' }, rating:5, review:'Cinema.', watchedDate:'2026-06-08' },
    ],
  },
  {
    id: 'friend_03', username: 'reel_antonio', displayName: 'Antonio Vega',
    emoji: '🍿',
    bio: '4DX or nothing. I need to feel the explosion.',
    logs: [
      { movie:{ id:'tt0816692', title:'Interstellar', year:'2014', poster:'' }, rating:3, review:'The sound design gave me tinnitus.', watchedDate:'2026-06-15' },
      { movie:{ id:'tt0137523', title:'Fight Club', year:'1999', poster:'' }, rating:4, review:'First time was wild.', watchedDate:'2026-06-12' },
    ],
  },
  {
    id: 'friend_04', username: 'priya_picks', displayName: 'Priya Patel',
    emoji: '🌙',
    bio: 'Watches two films a day. Sleeps never.',
    logs: [
      { movie:{ id:'tt0110912', title:'Pulp Fiction', year:'1994', poster:'' }, rating:4, review:'Timeless.', watchedDate:'2026-06-16' },
    ],
  },
];

/* ── Defaults ─────────────────────────────────── */
const DEFAULTS = () => ({
  profile: {
    username: 'Cinephile',
    handle: 'you',
    bio: 'Building my stash, one film at a time.',
    avatar: '',
    background: '',
  },
  settings: { tmdbKey: '', isPrivate: false, zip: '', radius: 25 },
  logs: [],
  watchlist: [],
  favorites: [],
  favoriteMovies: {},
  hotTakes: {},
  reviewReactions: {},
  following: ['friend_saqib', 'friend_01', 'friend_02'],
  followers: ['friend_03', 'friend_04'],
  blocked: [],
  demoFriendsSeeded: true,
});

/* ── Load / persist ───────────────────────────── */
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS(), ...parsed,
      profile:  { ...DEFAULTS().profile,  ...(parsed.profile  || {}) },
      settings: { ...DEFAULTS().settings, ...(parsed.settings || {}) },
      hotTakes: parsed.hotTakes || {},
      reviewReactions: parsed.reviewReactions || {},
      following: parsed.following ?? ['friend_saqib','friend_01','friend_02'],
      followers: parsed.followers ?? ['friend_03','friend_04'],
      blocked:   parsed.blocked   ?? [],
    };
  } catch { return DEFAULTS(); }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error('CINESTASH save error', e); }
}
function persist() {
  save();
  window.dispatchEvent(new CustomEvent('cinestash:change'));
}

/* ── Profile / settings ───────────────────────── */
export const get            = () => state;
export const getProfile     = () => state.profile;
export const getSettings    = () => state.settings;
export const updateProfile  = (p) => { state.profile  = { ...state.profile, ...p };  persist(); };
export const updateSettings = (p) => { state.settings = { ...state.settings, ...p }; persist(); };

/* ── Logs ─────────────────────────────────────── */
export const getLogs      = () => [...state.logs].sort((a,b) => new Date(b.watchedDate) - new Date(a.watchedDate));
export const getRecentLogs= () => [...state.logs].sort((a,b) => b.loggedAt - a.loggedAt);
export const getLogFor    = (id) => getRecentLogs().find(l => l.movie.id === id) || null;
export const getAllLogsFor = (id) => getRecentLogs().filter(l => l.movie.id === id);

export const stats = () => {
  const films    = new Set(state.logs.map(l => l.movie.id)).size;
  const thisYear = new Date().getFullYear();
  const yearCount= state.logs.filter(l => new Date(l.watchedDate).getFullYear() === thisYear).length;
  return { total: state.logs.length, films, thisYear: yearCount, watchlist: state.watchlist.length };
};

export function logMovie(movie, { rating, review, watchedDate, rewatch=false, editId=null }) {
  if (editId) {
    const e = state.logs.find(l => l.id === editId);
    if (e) { Object.assign(e, { rating, review, watchedDate, rewatch }); persist(); return e; }
  }
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    movie: slimMovie(movie), rating, review, watchedDate, rewatch, loggedAt: Date.now(),
  };
  state.logs.push(entry);
  state.watchlist = state.watchlist.filter(m => m.id !== movie.id);
  persist(); return entry;
}

export function deleteLog(logId) { state.logs = state.logs.filter(l => l.id !== logId); persist(); }

/* ── Watchlist ────────────────────────────────── */
export const getWatchlist   = () => [...state.watchlist].sort((a,b) => b.addedAt - a.addedAt);
export const isWatchlisted  = (id) => state.watchlist.some(m => m.id === id);

export function toggleWatchlist(movie) {
  if (isWatchlisted(movie.id)) {
    state.watchlist = state.watchlist.filter(m => m.id !== movie.id);
    persist(); return false;
  }
  state.watchlist.push({ ...slimMovie(movie), addedAt: Date.now() });
  persist(); return true;
}

/* ── Favorites ────────────────────────────────── */
export const getFavorites = () => state.favorites.map(id => state.favoriteMovies[id]).filter(Boolean);
export const isFavorite   = (id) => state.favorites.includes(id);

export function toggleFavorite(movie) {
  const id = movie.id;
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter(f => f !== id);
    delete state.favoriteMovies[id]; persist(); return false;
  }
  if (state.favorites.length >= 8) return 'full';
  state.favorites.push(id);
  state.favoriteMovies[id] = slimMovie(movie);
  persist(); return true;
}

/* ── Hot Takes ────────────────────────────────── */
export function getHotTakes(movieId) {
  const local = state.hotTakes[movieId] || [];
  const seed  = SEED_TAKES[movieId] || [];
  // merge seed + local, deduplicate by id
  const map = new Map();
  [...seed, ...local].forEach(t => map.set(t.id, t));
  return [...map.values()].sort((a,b) => b.spice - a.spice || b.agrees - a.agrees);
}

export function addHotTake(movieId, { username, text, spice }) {
  if (!state.hotTakes[movieId]) state.hotTakes[movieId] = [];
  const take = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    username, text, spice, agrees: 0, disagrees: 0, ts: Date.now(),
  };
  state.hotTakes[movieId].push(take);
  persist(); return take;
}

export function voteHotTake(movieId, takeId, vote) {
  // need to check both seeded and local
  if (!state.hotTakes[movieId]) state.hotTakes[movieId] = [];
  let take = state.hotTakes[movieId].find(t => t.id === takeId);
  if (!take) {
    // it's a seeded take — copy it to local so we can mutate
    const seed = (SEED_TAKES[movieId] || []).find(t => t.id === takeId);
    if (!seed) return;
    take = { ...seed };
    state.hotTakes[movieId].push(take);
  }
  if (vote === 'agree')    take.agrees++;
  if (vote === 'disagree') take.disagrees++;
  persist();
}

/* ── Review reactions: like / tomato ──────────── */
/* keyed by `${friendId}:${movieId}` → { liked:bool, tomatoes:number } */
export const getReviewReaction = (key) => state.reviewReactions[key] || { liked: false, tomatoes: 0 };

export function toggleReviewLike(key) {
  const r = state.reviewReactions[key] || { liked: false, tomatoes: 0 };
  r.liked = !r.liked;
  state.reviewReactions[key] = r;
  save();
  return r.liked;
}

/* unlimited — every throw counts */
export function throwTomatoAt(key) {
  const r = state.reviewReactions[key] || { liked: false, tomatoes: 0 };
  r.tomatoes = (r.tomatoes || 0) + 1;
  state.reviewReactions[key] = r;
  save();
  return r.tomatoes;
}

/* ── Social: following / followers ───────────── */
export const getFollowing  = () => state.following || [];
export const getFollowers  = () => state.followers || [];
export const getDemoFriends= () => DEMO_FRIENDS;
export const isFollowing   = (id) => (state.following || []).includes(id);

export function follow(userId) {
  if (!state.following.includes(userId)) {
    state.following.push(userId); persist();
  }
}
export function unfollow(userId) {
  state.following = state.following.filter(id => id !== userId);
  persist();
}

/* remove a follower (they stay on platform, just no longer follow you) */
export function removeFollower(userId) {
  state.followers = state.followers.filter(id => id !== userId);
  persist();
}

/* block: remove from followers + following, add to blocked list */
export function blockUser(userId) {
  state.followers = state.followers.filter(id => id !== userId);
  state.following = state.following.filter(id => id !== userId);
  if (!state.blocked.includes(userId)) state.blocked.push(userId);
  persist();
}

export function unblockUser(userId) {
  state.blocked = state.blocked.filter(id => id !== userId);
  persist();
}

export const getBlocked   = () => state.blocked || [];
export const isBlocked    = (id) => (state.blocked || []).includes(id);

/* privacy */
export const isPrivate    = () => !!(state.settings?.isPrivate);
export function setPrivacy(priv) {
  state.settings = { ...state.settings, isPrivate: !!priv };
  persist();
}

/* ── Backup / restore ─────────────────────────── */
export const exportData = () => JSON.stringify(state, null, 2);
export function importData(json) { state = { ...DEFAULTS(), ...JSON.parse(json) }; persist(); }
export function wipe()           { state = DEFAULTS(); persist(); }

/* ── Utility ──────────────────────────────────── */
function slimMovie(m) {
  return {
    id: m.id, title: m.title,
    year:        m.year || (m.release_date ? m.release_date.slice(0,4) : ''),
    poster:      m.poster || m.poster_path || '',
    backdrop:    m.backdrop || m.backdrop_path || '',
    voteAverage: m.voteAverage ?? m.vote_average ?? null,
    overview:    m.overview || '',
  };
}
