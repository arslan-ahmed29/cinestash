/* ░░ pages/friends.js — Friends activity feed ░░ */

import { getDemoFriends, getFollowing, follow, unfollow, isFollowing, isBlocked } from '../storage.js';
import { poster } from '../api.js';
import { starsHtml, esc, toast, openModal, closeModal } from '../ui.js';
import { openDetail } from '../detail.js';

const IMG_W92 = 'https://image.tmdb.org/t/p/w92';

export function renderFriends(app) {
  const friends   = getDemoFriends().filter(f => !isBlocked(f.id));
  const following = getFollowing();

  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">Friends</h1>
    <p class="page-head__sub">See what people you follow are watching</p>
  </div>

  <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;align-items:center">
    <span style="font-size:14px;color:var(--label-2);font-weight:500">People to follow</span>
  </div>

  <!-- suggested friends -->
  <div class="ios-list fade-in" style="margin-top:12px" id="suggestedList">
    ${friends.map(f => suggestedRow(f, following.includes(f.id))).join('')}
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
    if (feed) feed.innerHTML = buildFeed(getDemoFriends(), getFollowing());
  });

  /* open movie on feed item click */
  document.getElementById('friendsFeed')?.addEventListener('click', e => {
    const item = e.target.closest('.friend-item[data-movie-id]');
    if (item) openDetail({ id: parseInt(item.dataset.movieId), title: item.dataset.title, year: item.dataset.year, poster: item.dataset.poster });
  });
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
    const imgP = log.movie.poster ? `${IMG_W92}${log.movie.poster}` : '';
    const stars = log.rating ? starsHtml(log.rating) : '';
    const followed = following.includes(friend.id);
    const opacity = followed ? '' : 'opacity:0.45';
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
