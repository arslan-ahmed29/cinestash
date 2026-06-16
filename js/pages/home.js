/* ░░ pages/home.js — Profile page ░░ */

import { getProfile, getFavorites, getRecentLogs, stats, updateProfile,
         toggleWatchlist, getFollowing, getFollowers, getDemoFriends, follow, unfollow, isFollowing } from '../storage.js';
import { trending, hasKey } from '../api.js';
import { cardHtml, carouselHtml, attachCarouselNav, toast, esc, fileToDataUrl, loaderHtml } from '../ui.js';
import { openModal, closeModal } from '../ui.js';
import { openDetail } from '../detail.js';
import { openLogForm } from '../logform.js';

const IMG_W92 = 'https://image.tmdb.org/t/p/w92';

export async function renderHome(app) {
  const profile  = getProfile();
  const s        = stats();
  const favs     = getFavorites();
  const recent   = getRecentLogs().slice(0, 24);
  const following = getFollowing();
  const followers = getFollowers();

  app.innerHTML = `
    ${profileHeaderHtml(profile, s, following, followers)}

    <!-- segmented tabs -->
    <div class="seg-ctrl" id="profileTabs">
      <button class="seg-ctrl__opt is-active" data-tab="stash">Stash</button>
      <button class="seg-ctrl__opt" data-tab="friends">Friends Watching</button>
    </div>

    <!-- tab content -->
    <div id="profileTabContent" class="fade-in">
      ${stashTabHtml(favs, recent)}
    </div>

    <input type="file" accept="image/*" id="bannerFileInput" style="display:none">
    <input type="file" accept="image/*" id="avatarFileInput" style="display:none">`;

  /* tabs */
  document.getElementById('profileTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.seg-ctrl__opt');
    if (!btn) return;
    document.querySelectorAll('.seg-ctrl__opt').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const tab = btn.dataset.tab;
    const content = document.getElementById('profileTabContent');
    if (content) {
      content.classList.remove('fade-in');
      void content.offsetWidth;
      content.classList.add('fade-in');
      if (tab === 'stash')   { content.innerHTML = stashTabHtml(getFavorites(), getRecentLogs().slice(0, 24)); attachCarouselNav('favCarousel'); attachCarouselNav('recentCarousel'); bindCardEvents(content); }
      if (tab === 'friends') { content.innerHTML = friendsTabHtml(); bindFriendTabEvents(content); }
    }
  });

  attachCarouselNav('favCarousel');
  attachCarouselNav('recentCarousel');
  bindProfileEdits();
  bindCardEvents(app);
  bindSocialButtons();

  /* trending section */
  const trendSection = document.createElement('div');
  trendSection.id = 'trendingSection';
  trendSection.className = 'section';
  trendSection.innerHTML = `<div class="section__head"><h2 class="section__title">Trending This Week</h2></div>${hasKey() ? loaderHtml : noKeyBanner()}`;
  document.getElementById('profileTabContent')?.appendChild(trendSection);
  if (hasKey()) loadTrending();
}

/* ── Tabs ─────────────────────────────────────── */
function stashTabHtml(favs, recent) {
  return `
  ${favs.length ? `
  <div class="section">
    <div class="section__head">
      <h2 class="section__title">Favorites</h2>
      <span class="section__count">${favs.length}/8</span>
    </div>
    ${carouselHtml('favCarousel', favs.map((m,i) => cardHtml(m, { rank: i+1 })))}
  </div>` : `
  <div class="section">
    <div class="section__head"><h2 class="section__title">Favorites</h2></div>
    ${emptyFavs()}
  </div>`}
  ${recent.length ? `
  <div class="section">
    <div class="section__head">
      <h2 class="section__title">Recently Reviewed</h2>
      <span class="section__count">${recent.length}</span>
    </div>
    ${carouselHtml('recentCarousel', recent.map(l => cardHtml(l.movie)))}
  </div>` : `
  <div class="section">
    <div class="section__head"><h2 class="section__title">Recently Reviewed</h2></div>
    ${emptyRecent()}
  </div>`}`;
}

function friendsTabHtml() {
  const friends  = getDemoFriends();
  const following = getFollowing();
  // aggregate all logs from people you follow
  const items = [];
  for (const f of friends) {
    for (const log of f.logs) {
      items.push({ friend: f, log, ts: new Date(log.watchedDate).getTime(), followed: following.includes(f.id) });
    }
  }
  items.sort((a,b) => b.ts - a.ts);

  if (!items.length || !following.length) {
    return `<div class="empty" style="margin-top:20px"><div class="empty__icon">👥</div><div class="empty__title">No activity</div><div class="empty__text">Follow friends in the Friends tab to see what they're watching.</div></div>`;
  }

  return `
  <div class="friends-feed" style="margin-top:8px">
    ${items.filter(i => i.followed).slice(0, 12).map(({ friend, log }) => {
      const imgP = log.movie.poster ? `${IMG_W92}${log.movie.poster}` : '';
      const stars = log.rating ? starsHtml(log.rating) : '';
      return `
      <div class="friend-item" data-movie-id="${log.movie.id}" data-title="${esc(log.movie.title)}" data-year="${esc(log.movie.year)}" data-poster="${esc(log.movie.poster||'')}" role="button" tabindex="0">
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
    }).join('')}
  </div>`;
}

function bindFriendTabEvents(root) {
  root.addEventListener('click', e => {
    const item = e.target.closest('.friend-item[data-movie-id]');
    if (item) openDetail({ id: parseInt(item.dataset.movieId), title: item.dataset.title, year: item.dataset.year, poster: item.dataset.poster });
  });
}

function starsHtml(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) s += '★'; else if (i === full+1 && half) s += '½'; else s += '☆';
  }
  return s;
}

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today'; if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

/* ── Profile header ───────────────────────────── */
function profileHeaderHtml(profile, s, following, followers) {
  const banner = profile.background;
  const avatar = profile.avatar;
  return `
  <div class="profile fade-in">
    <div class="profile__banner"${banner ? ` style="background-image:url('${banner}')"` : ''}>
      <button class="profile__edit-banner" id="editBannerBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Change banner
      </button>
    </div>
    <div class="profile__body">
      <div class="profile__avatar-wrap">
        <div class="profile__avatar" id="profileAvatar" style="${avatar ? `background-image:url('${avatar}')` : ''}">
          ${avatar ? '' : '🎬'}
        </div>
        <button class="profile__avatar-edit" id="editAvatarBtn" aria-label="Change avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
      <div class="profile__meta">
        <div class="profile__name">
          <span id="profileUsername">${esc(profile.username)}</span>
          <button class="edit-name" id="editNameBtn" aria-label="Edit name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:15px;height:15px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
        <div class="profile__handle">@${esc(profile.handle)}</div>
        <div class="profile__bio" id="profileBio">${esc(profile.bio)}</div>

        <!-- social stats -->
        <div class="profile__social" style="margin-top:14px">
          <div class="profile__stats" style="gap:20px">
            <div class="stat"><div class="stat__num">${s.films}</div><div class="stat__label">Films</div></div>
            <div class="stat"><div class="stat__num">${s.thisYear}</div><div class="stat__label">This Year</div></div>
          </div>
          <div class="profile__social-divider" style="width:1px;height:40px;background:var(--sep);margin:0 16px;align-self:center"></div>
          <button class="profile__social-stat" id="followersBtn" title="Followers">
            <span class="profile__social-num">${followers.length}</span>
            <span class="profile__social-label">Followers</span>
          </button>
          <button class="profile__social-stat" id="followingBtn" title="Following">
            <span class="profile__social-num">${following.length}</span>
            <span class="profile__social-label">Following</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── Social modals ────────────────────────────── */
function bindSocialButtons() {
  document.getElementById('followersBtn')?.addEventListener('click', () => openUserList('Followers', getFollowers()));
  document.getElementById('followingBtn')?.addEventListener('click', () => openUserList('Following', getFollowing(), true));
}

function openUserList(title, userIds, canUnfollow = false) {
  const friends = getDemoFriends();
  const rows = userIds.map(id => {
    const f = friends.find(fr => fr.id === id);
    if (!f) return '';
    const followed = isFollowing(f.id);
    return `
    <div class="ios-list__item">
      <div class="ios-list__avatar">${f.emoji}</div>
      <div class="ios-list__info">
        <div class="ios-list__name">${esc(f.displayName)}</div>
        <div class="ios-list__sub">@${esc(f.username)}</div>
      </div>
      ${canUnfollow ? `<button class="ios-list__action is-following" data-toggle-follow="${f.id}">${followed ? 'Following' : 'Follow'}</button>` : ''}
    </div>`;
  }).join('');

  openModal(`
  <div class="dialog">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <h2 class="dialog__title" style="margin:0">${esc(title)}</h2>
      <button class="btn btn--ghost btn--sm" id="socialModalClose">Done</button>
    </div>
    <div class="ios-list">${rows || '<div style="padding:20px;text-align:center;color:var(--label-2);font-size:14px">Nobody here yet</div>'}</div>
  </div>`);

  document.getElementById('socialModalClose')?.addEventListener('click', closeModal);
  document.querySelector('.dialog')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle-follow]');
    if (!btn) return;
    const id = btn.dataset.toggleFollow;
    if (isFollowing(id)) { unfollow(id); btn.textContent = 'Follow'; btn.classList.remove('is-following'); }
    else { follow(id); btn.textContent = 'Following'; btn.classList.add('is-following'); }
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });
}

/* ── Trending ─────────────────────────────────── */
async function loadTrending() {
  const sec = document.getElementById('trendingSection');
  if (!sec) return;
  try {
    const { trending } = await import('../api.js');
    const movies = await trending();
    const placeholder = sec.querySelector('.loader');
    if (placeholder) placeholder.remove();
    const html = carouselHtml('trendCarousel', movies.map(m => cardHtml(m)));
    sec.insertAdjacentHTML('beforeend', html);
    attachCarouselNav('trendCarousel');
    bindCardEvents(sec);
  } catch (e) {
    const placeholder = sec.querySelector('.loader');
    if (placeholder) placeholder.innerHTML = '<p style="color:var(--sys-red);font-size:14px;padding:16px">Failed to load trending — check your API key in Settings.</p>';
  }
}

/* ── Empty states ─────────────────────────────── */
function emptyFavs() {
  return `<div class="empty"><div class="empty__icon">⭐</div><div class="empty__title">No favorites yet</div><div class="empty__text">Open any movie and tap Favorite to pin it here.</div></div>`;
}
function emptyRecent() {
  return `<div class="empty"><div class="empty__icon">🎬</div><div class="empty__title">Your stash is empty</div><div class="empty__text">Search for a film and log it to start your CINESTASH.</div></div>`;
}
function noKeyBanner() {
  return `<div class="no-key-banner" style="margin-top:16px">
    Add your free <strong>TMDB API key</strong> in <button class="btn btn--ghost btn--sm" id="openSettingsFromHome" style="display:inline-flex;padding:4px 8px">Settings</button> to unlock search and trending.
  </div>`;
}

/* ── Profile editing ──────────────────────────── */
function bindProfileEdits() {
  document.getElementById('editBannerBtn')?.addEventListener('click', () => document.getElementById('bannerFileInput')?.click());
  document.getElementById('bannerFileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await fileToDataUrl(file);
    updateProfile({ background: url });
    document.querySelector('.profile__banner').style.backgroundImage = `url('${url}')`;
    toast('Banner updated', '🖼');
  });

  document.getElementById('editAvatarBtn')?.addEventListener('click', () => document.getElementById('avatarFileInput')?.click());
  document.getElementById('avatarFileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await fileToDataUrl(file);
    updateProfile({ avatar: url });
    const av = document.getElementById('profileAvatar');
    av.style.backgroundImage = `url('${url}')`;
    av.textContent = '';
    toast('Avatar updated', '✓');
  });

  document.getElementById('editNameBtn')?.addEventListener('click', () => {
    const nameEl = document.getElementById('profileUsername');
    const current = nameEl.textContent;
    nameEl.innerHTML = `<input id="nameEditInput" class="input" value="${esc(current)}" style="width:180px;padding:5px 9px;font-size:20px;font-weight:700">`;
    const inp = document.getElementById('nameEditInput');
    inp?.focus(); inp?.select();
    const save = () => { const v = inp.value.trim() || current; updateProfile({ username: v }); nameEl.innerHTML = esc(v); toast('Name updated', '✓'); };
    inp?.addEventListener('blur', save);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  });

  document.getElementById('openSettingsFromHome')?.addEventListener('click', () => document.getElementById('settingsBtn')?.click());
}

/* ── Card click delegation ────────────────────── */
export function bindCardEvents(root) {
  root.addEventListener('click', async e => {
    const logBtn = e.target.closest('[data-action="log"]');
    if (logBtn) {
      e.stopPropagation();
      const card = logBtn.closest('.card');
      const movie = extractMovieFromCard(card);
      openLogForm(movie, null); return;
    }
    const wlBtn = e.target.closest('[data-action="watchlist"]');
    if (wlBtn) {
      e.stopPropagation();
      const card = wlBtn.closest('.card');
      const movie = extractMovieFromCard(card);
      const added = toggleWatchlist(movie);
      toast(added ? 'Added to watchlist' : 'Removed from watchlist', added ? '🔖' : '✓');
      window.dispatchEvent(new CustomEvent('cinestash:change')); return;
    }
    const card = e.target.closest('.card');
    if (card) openDetail(extractMovieFromCard(card));
  });
  root.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); e.target.click(); }
  });
}

function extractMovieFromCard(card) {
  if (!card) return {};
  const imgStyle = card.querySelector('.card__poster')?.style.backgroundImage || '';
  const posterPath = imgStyle.match(/url\(['"]?.*?(\/.+?)['"]?\)/)?.[1] || '';
  return {
    id: parseInt(card.dataset.movieId),
    title: card.querySelector('.card__title')?.textContent || '',
    year:  card.querySelector('.card__sub')?.textContent?.replace(' ◆','').trim() || '',
    poster: posterPath,
  };
}
