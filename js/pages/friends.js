/* ░░ pages/friends.js — Friends activity feed ░░ */

import { getDemoFriends, getFollowing, follow, unfollow, isFollowing, isBlocked,
         getReviewReaction, toggleReviewLike, throwTomatoAt,
         getLogs, getLogFor } from '../storage.js?v=cb6';
import { poster } from '../api.js?v=cb6';
import { starsHtml, esc, toast, openModal, closeModal } from '../ui.js?v=cb6';
import { openDetail } from '../detail.js?v=cb6';

export function renderFriends(app) {
  const friends   = getDemoFriends().filter(f => !isBlocked(f.id));
  const following = getFollowing();

  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">Friends</h1>
    <p class="page-head__sub">See what people you follow are watching</p>
  </div>

  <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;align-items:center">
    <span style="font-size:14px;color:var(--label-2);font-weight:500">Find friends</span>
  </div>

  <!-- friend search -->
  <input class="input friends-search__input fade-in" id="friendSearchInput" type="search"
         placeholder="Search by name or @handle…" autocomplete="off" style="margin-top:10px" />

  <!-- suggested / matching friends -->
  <div class="ios-list fade-in" style="margin-top:12px" id="suggestedList">
    ${renderSuggested(friends, following, '')}
  </div>

  <!-- taste match -->
  <div style="margin-top:32px">
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:4px">Taste Match</h2>
    <p style="font-size:13px;color:var(--label-2);margin-bottom:14px">How close is your taste to each friend's — based on films you've both logged</p>
    <div class="match-grid fade-in" id="matchGrid">
      ${friends.map(matchCard).join('')}
    </div>
  </div>

  <!-- blind spots -->
  ${blindSpotsHtml(friends)}

  <!-- feed -->
  <div style="margin-top:32px">
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:14px">Recent Activity</h2>
    <div class="friends-feed fade-in" id="friendsFeed">
      ${buildFeed(friends, following)}
    </div>
  </div>`;

  /* taste-match card click → detail modal */
  document.getElementById('matchGrid')?.addEventListener('click', e => {
    const card = e.target.closest('.match-card[data-friend-id]');
    if (card) openMatchDetail(card.dataset.friendId);
  });

  /* blind-spot rows open the movie */
  document.getElementById('blindSpotsList')?.addEventListener('click', e => {
    const row = e.target.closest('.blind-spot[data-movie-id]');
    if (row) openDetail({ id: row.dataset.movieId, title: row.dataset.title, year: row.dataset.year, poster: row.dataset.poster });
  });

  /* follow/unfollow buttons */
  document.getElementById('suggestedList')?.addEventListener('click', e => {
    const btn = e.target.closest('.ios-list__action');
    if (!btn) return;
    const id = btn.dataset.friendId;
    const currently = isFollowing(id);
    if (currently) { unfollow(id); btn.textContent = 'Follow'; btn.classList.remove('is-following'); toast('Unfollowed', '✓'); }
    else           { follow(id);   btn.textContent = 'Following'; btn.classList.add('is-following'); toast('Following!', '✓'); }
    // re-render feed
    const feed = document.getElementById('friendsFeed');
    if (feed) feed.innerHTML = buildFeed(activeFriends(), getFollowing());
  });

  /* live friend search */
  document.getElementById('friendSearchInput')?.addEventListener('input', e => {
    const list = document.getElementById('suggestedList');
    if (list) list.innerHTML = renderSuggested(activeFriends(), getFollowing(), e.target.value);
  });

  /* feed clicks: handle reactions first, otherwise open the film */
  document.getElementById('friendsFeed')?.addEventListener('click', e => {
    const reactBtn = e.target.closest('.review-react__btn');
    if (reactBtn) { handleReact(reactBtn); return; }
    const item = e.target.closest('.friend-item[data-movie-id]');
    if (item) openDetail({ id: item.dataset.movieId, title: item.dataset.title, year: item.dataset.year, poster: item.dataset.poster });
  });
}

/* friends minus anyone blocked */
function activeFriends() { return getDemoFriends().filter(f => !isBlocked(f.id)); }

/* ── Taste matching ──────────────────────────────── */
/* Compare your logs with a friend's: shared films score by how close
   your ratings are; more overlap = more confidence in the number.   */
function computeMatch(friend) {
  const myLogs = getLogs();
  const mine = new Map(myLogs.map(l => [l.movie.id, l]));
  const shared = [];
  for (const flog of friend.logs) {
    const ulog = mine.get(flog.movie.id);
    if (ulog) shared.push({ movie: flog.movie, yours: ulog.rating, theirs: flog.rating });
  }
  if (!shared.length) return { score: null, shared, recs: friendRecs(friend, mine) };

  const closeness = shared.map(s =>
    (s.yours != null && s.theirs != null) ? 1 - Math.abs(s.yours - s.theirs) / 5 : 0.5);
  const avgClose = closeness.reduce((a, b) => a + b, 0) / closeness.length;
  const overlap  = Math.min(1, shared.length / 5);
  const score    = Math.round((0.65 * avgClose + 0.35 * overlap) * 100);
  return { score, shared, recs: friendRecs(friend, mine) };
}

/* films the friend rated 4+ that you haven't logged — "you'd both love" */
function friendRecs(friend, mine) {
  return friend.logs
    .filter(l => (l.rating ?? 0) >= 4 && !mine.has(l.movie.id))
    .sort((a, b) => b.rating - a.rating);
}

function matchCard(friend) {
  const { score, shared } = computeMatch(friend);
  const pct   = score ?? 0;
  const hue   = score == null ? 'var(--fill)' : `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--fill) 0deg)`;
  const label = score == null ? '—' : `${score}%`;
  const sub   = score == null
    ? 'No shared films yet'
    : `${shared.length} shared film${shared.length !== 1 ? 's' : ''}`;
  return `
  <div class="match-card" data-friend-id="${friend.id}" role="button" tabindex="0">
    <div class="match-ring" style="background:${hue}"><span>${label}</span></div>
    <div class="match-card__name">${friend.emoji} ${esc(friend.displayName)}</div>
    <div class="match-card__sub">${sub}</div>
  </div>`;
}

function openMatchDetail(friendId) {
  const friend = getDemoFriends().find(f => f.id === friendId);
  if (!friend) return;
  const { score, shared, recs } = computeMatch(friend);

  openModal(`
  <div class="dialog">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <h2 class="dialog__title" style="margin:0">${friend.emoji} ${esc(friend.displayName)}</h2>
      <button class="btn btn--ghost btn--sm" id="matchModalClose">Done</button>
    </div>
    <p class="dialog__sub">${score == null
      ? 'Log some films you\'ve both seen to unlock your match score.'
      : `You're a <strong style="color:var(--accent)">${score}% taste match</strong> across ${shared.length} shared film${shared.length !== 1 ? 's' : ''}.`}</p>

    ${shared.length ? `
    <h3 class="match-section-title">Films you've both seen</h3>
    <div class="ios-list" style="margin-bottom:20px">
      ${shared.map(s => `
      <div class="ios-list__item">
        <div class="ios-list__info">
          <div class="ios-list__name">${esc(s.movie.title)}</div>
          <div class="ios-list__sub">You: ${s.yours != null ? starsHtml(s.yours) : 'unrated'} · Them: ${s.theirs != null ? starsHtml(s.theirs) : 'unrated'}</div>
        </div>
      </div>`).join('')}
    </div>` : ''}

    ${recs.length ? `
    <h3 class="match-section-title">You'd probably love</h3>
    <p style="font-size:12.5px;color:var(--label-2);margin-bottom:10px">Films ${esc(friend.displayName)} rated ★4+ that you haven't logged</p>
    <div class="ios-list" id="matchRecsList">
      ${recs.map(l => `
      <div class="ios-list__item" data-movie-id="${l.movie.id}" data-title="${esc(l.movie.title)}" data-year="${esc(l.movie.year)}" data-poster="${esc(l.movie.poster || '')}" role="button" tabindex="0" style="cursor:pointer">
        <div class="ios-list__info">
          <div class="ios-list__name">${esc(l.movie.title)} <span style="color:var(--label-3);font-weight:400">${l.movie.year}</span></div>
          <div class="ios-list__sub">${starsHtml(l.rating)}${l.review ? ` · "${esc(l.review)}"` : ''}</div>
        </div>
        <span style="color:var(--accent);font-size:18px">›</span>
      </div>`).join('')}
    </div>` : `<p style="font-size:13px;color:var(--label-2)">No recommendations yet — they haven't loved anything you're missing.</p>`}
  </div>`);

  document.getElementById('matchModalClose')?.addEventListener('click', closeModal);
  document.getElementById('matchRecsList')?.addEventListener('click', e => {
    const row = e.target.closest('[data-movie-id]');
    if (!row) return;
    closeModal();
    openDetail({ id: row.dataset.movieId, title: row.dataset.title, year: row.dataset.year, poster: row.dataset.poster });
  });
}

/* ── Blind spots: films 2+ friends have seen but you haven't ── */
function blindSpotsHtml(friends) {
  const counts = new Map(); // movieId -> { movie, watchers: [] }
  for (const f of friends) {
    for (const log of f.logs) {
      if (getLogFor(log.movie.id)) continue; // you've seen it
      const entry = counts.get(log.movie.id) || { movie: log.movie, watchers: [] };
      entry.watchers.push(f);
      counts.set(log.movie.id, entry);
    }
  }
  const spots = [...counts.values()]
    .filter(e => e.watchers.length >= 2)
    .sort((a, b) => b.watchers.length - a.watchers.length);
  if (!spots.length) return '';

  return `
  <div style="margin-top:32px">
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:4px">Your Blind Spots 🙈</h2>
    <p style="font-size:13px;color:var(--label-2);margin-bottom:14px">Films your friends have all seen — and you haven't</p>
    <div class="ios-list fade-in" id="blindSpotsList">
      ${spots.map(({ movie, watchers }) => `
      <div class="ios-list__item blind-spot" data-movie-id="${movie.id}" data-title="${esc(movie.title)}" data-year="${esc(movie.year)}" data-poster="${esc(movie.poster || '')}" role="button" tabindex="0" style="cursor:pointer">
        <div class="ios-list__info">
          <div class="ios-list__name">${esc(movie.title)} <span style="color:var(--label-3);font-weight:400">${movie.year}</span></div>
          <div class="ios-list__sub">Seen by ${watchers.map(w => w.emoji).join(' ')} ${watchers.length} friend${watchers.length !== 1 ? 's' : ''} — not you</div>
        </div>
        <span style="color:var(--accent);font-size:18px">›</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderSuggested(friends, following, query) {
  const q = (query || '').trim().toLowerCase();
  const list = !q ? friends : friends.filter(f =>
    f.displayName.toLowerCase().includes(q) ||
    f.username.toLowerCase().includes(q) ||
    (f.bio || '').toLowerCase().includes(q));
  if (!list.length) return `<div class="ios-list__empty">No one matches “${esc(query)}”</div>`;
  return list.map(f => suggestedRow(f, following.includes(f.id))).join('');
}

function suggestedRow(friend, followed) {
  return `
  <div class="ios-list__item">
    <div class="ios-list__avatar">${friend.emoji}</div>
    <div class="ios-list__info">
      <div class="ios-list__name">${esc(friend.displayName)}</div>
      <div class="ios-list__sub">@${esc(friend.username)} · ${esc(friend.bio)}</div>
    </div>
    <button class="ios-list__action ${followed ? 'is-following' : ''}" data-friend-id="${friend.id}">
      ${followed ? 'Following' : 'Follow'}
    </button>
  </div>`;
}

function buildFeed(friends, following) {
  const items = [];
  for (const f of friends) {
    for (const log of f.logs) {
      items.push({ friend: f, log, ts: new Date(log.watchedDate).getTime() });
    }
  }
  items.sort((a, b) => b.ts - a.ts);

  if (!items.length) return emptyFeed();

  return items.map(({ friend, log }) => {
    const imgP = log.movie.poster || '';
    const stars = log.rating ? starsHtml(log.rating) : '';
    const followed = following.includes(friend.id);
    const opacity = followed ? '' : 'opacity:0.45';
    const key = `${friend.id}:${log.movie.id}`;
    const r = getReviewReaction(key);
    return `
    <div class="friend-item" data-movie-id="${log.movie.id}" data-title="${esc(log.movie.title)}" data-year="${esc(log.movie.year)}" data-poster="${esc(log.movie.poster || '')}" role="button" tabindex="0" style="${opacity}">
      <div class="friend-item__avatar">${friend.emoji}</div>
      <div style="display:flex;gap:10px;flex:1;min-width:0">
        <div class="friend-item__poster" ${imgP ? `style="background-image:url('${imgP}')"` : ''}></div>
        <div class="friend-item__body">
          <div class="friend-item__who"><strong>${esc(friend.displayName)}</strong> <span>watched</span></div>
          <div class="friend-item__title">${esc(log.movie.title)} <span style="color:var(--label-3);font-weight:400;font-size:13px">${log.movie.year}</span></div>
          ${stars ? `<div class="friend-item__stars">${stars}</div>` : ''}
          ${log.review ? `<div class="friend-item__review">"${esc(log.review)}"</div>` : ''}
          ${log.review ? reactionBar(key, r) : ''}
          <div class="friend-item__time">${relTime(log.watchedDate)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function emptyFeed() {
  return `<div class="empty"><div class="empty__icon">👥</div><div class="empty__title">No activity yet</div><div class="empty__text">Follow some friends above to see what they're watching.</div></div>`;
}

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Review reactions: like + throw-tomato ───────── */
function reactionBar(key, r) {
  return `
    <div class="review-react">
      <button class="review-react__btn ${r.liked ? 'is-liked' : ''}" data-action="like" data-key="${esc(key)}">
        <span class="review-react__emoji">${r.liked ? '❤️' : '🤍'}</span>${r.liked ? 'Liked' : 'Like'}
      </button>
      <button class="review-react__btn review-react__tomato" data-action="dislike" data-key="${esc(key)}">
        🍅 Throw tomato${r.tomatoes ? ` <strong>${r.tomatoes}</strong>` : ''}
      </button>
    </div>`;
}

function handleReact(btn) {
  const key = btn.dataset.key;
  if (btn.dataset.action === 'like') {
    const liked = toggleReviewLike(key);
    btn.classList.toggle('is-liked', liked);
    btn.innerHTML = `<span class="review-react__emoji">${liked ? '❤️' : '🤍'}</span>${liked ? 'Liked' : 'Like'}`;
  } else {
    const count = throwTomatoAt(key);   // unlimited — every throw counts
    launchTomato();
    btn.innerHTML = `🍅 Throw tomato <strong>${count}</strong>`;
    btn.animate([{ transform:'scale(1)' }, { transform:'scale(0.9)' }, { transform:'scale(1)' }],
                { duration: 180, easing: 'ease-out' });
  }
}

/* ── Tomato throw animation ──────────────────────── */
function tomatoLayer() {
  let layer = document.getElementById('tomatoLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'tomatoLayer';
    layer.className = 'tomato-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

/* a tomato flies in from off-screen, arcs, and splats — call as often as you like */
function launchTomato() {
  const layer = tomatoLayer();
  const vw = window.innerWidth, vh = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? -80 : vw + 80;
  const startY = vh * (0.55 + Math.random() * 0.35);
  const endX   = vw * (0.22 + Math.random() * 0.56);
  const endY   = vh * (0.22 + Math.random() * 0.42);
  const apexX  = (startX + endX) / 2;
  const apexY  = Math.min(startY, endY) - (140 + Math.random() * 110);
  const spin   = (fromLeft ? 1 : -1) * (520 + Math.random() * 220);
  const dur    = 620 + Math.random() * 160;

  const tomato = document.createElement('div');
  tomato.className = 'tomato-fly';
  tomato.textContent = '🍅';
  layer.appendChild(tomato);

  const anim = tomato.animate([
    { transform:`translate(${startX}px,${startY}px) rotate(0deg) scale(0.7)`,            offset: 0 },
    { transform:`translate(${apexX}px,${apexY}px) rotate(${spin * 0.6}deg) scale(1.05)`,  offset: 0.55 },
    { transform:`translate(${endX}px,${endY}px) rotate(${spin}deg) scale(1.15)`,          offset: 1 },
  ], { duration: dur, easing: 'cubic-bezier(.45,.05,.6,1)', fill: 'forwards' });

  anim.onfinish = () => { tomato.remove(); splat(layer, endX, endY); };
}

function splat(layer, x, y) {
  const rot = Math.random() * 60 - 30;
  const s = document.createElement('div');
  s.className = 'tomato-splat';
  s.style.left = `${x}px`;
  s.style.top  = `${y}px`;
  layer.appendChild(s);
  const a = s.animate([
    { transform:`translate(-50%,-50%) rotate(${rot}deg) scale(0.3)`,  opacity: 1,    offset: 0 },
    { transform:`translate(-50%,-50%) rotate(${rot}deg) scale(1.05)`, opacity: 1,    offset: 0.14 },
    { transform:`translate(-50%,-50%) rotate(${rot}deg) scale(1)`,    opacity: 0.95, offset: 0.55 },
    { transform:`translate(-50%,-50%) rotate(${rot}deg) scale(1.12)`, opacity: 0,    offset: 1 },
  ], { duration: 1500, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  a.onfinish = () => s.remove();
}
