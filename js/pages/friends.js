/* ░░ pages/friends.js — Friends activity feed ░░ */

import { getDemoFriends, getFollowing, follow, unfollow, isFollowing, isBlocked,
         getReviewReaction, toggleReviewLike, throwTomatoAt } from '../storage.js';
import { poster } from '../api.js';
import { starsHtml, esc, toast, openModal, closeModal } from '../ui.js';
import { openDetail } from '../detail.js';

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

  <!-- feed -->
  <div style="margin-top:32px">
    <h2 style="font-size:17px;font-weight:700;letter-spacing:-0.2px;margin-bottom:14px">Recent Activity</h2>
    <div class="friends-feed fade-in" id="friendsFeed">
      ${buildFeed(friends, following)}
    </div>
  </div>`;

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
