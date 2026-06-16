/* ░░ pages/home.js — Profile page ░░ */

import { getProfile, getFavorites, getRecentLogs, stats, updateProfile, toggleWatchlist } from '../storage.js';
import { trending, hasKey } from '../api.js';
import { cardHtml, carouselHtml, attachCarouselNav, toast, esc, fileToDataUrl, loaderHtml } from '../ui.js';
import { openDetail } from '../detail.js';
import { openLogForm } from '../logform.js';

export async function renderHome(app) {
  const profile = getProfile();
  const s = stats();
  const favs = getFavorites();
  const recent = getRecentLogs().slice(0, 20);

  app.innerHTML = `
    ${profileHeaderHtml(profile, s)}
    ${section('Favorites ◆', 'favCarousel', favs.length
        ? carouselHtml('favCarousel', favs.map((m, i) => cardHtml(m, { rank: i + 1 })))
        : emptyFavs())}
    ${section('Recently Reviewed', 'recentCarousel', recent.length
        ? carouselHtml('recentCarousel', recent.map(l => cardHtml(l.movie)))
        : emptyRecent())}
    <div id="trendingSection" class="section">
      <div class="section__head">
        <h2 class="section__title"><span class="marquee-bullet"></span>Trending This Week</h2>
      </div>
      ${hasKey() ? loaderHtml : noKeyBanner()}
    </div>`;

  attachCarouselNav('favCarousel');
  attachCarouselNav('recentCarousel');
  bindProfileEdits();
  bindCardEvents(app);

  if (hasKey()) {
    loadTrending();
  }
}

async function loadTrending() {
  const sec = document.getElementById('trendingSection');
  if (!sec) return;
  try {
    const movies = await trending();
    const placeholder = sec.querySelector('.loader') || sec.querySelector('.no-key-banner');
    if (placeholder) placeholder.remove();
    const html = carouselHtml('trendCarousel', movies.map(m => cardHtml(m)));
    sec.insertAdjacentHTML('beforeend', html);
    attachCarouselNav('trendCarousel');
    // bind new cards
    bindCardEvents(sec);
  } catch (e) {
    const placeholder = sec.querySelector('.loader');
    if (placeholder) placeholder.remove();
    if (e.code === 'BAD_KEY') {
      sec.insertAdjacentHTML('beforeend', '<p style="color:var(--brand);font-size:14px;margin-top:14px">Invalid TMDB key — check Settings.</p>');
    }
  }
}

/* ── profile header ──────────────────────────────────── */
function profileHeaderHtml(profile, s) {
  const banner = profile.background;
  const avatar = profile.avatar;
  return `
  <div class="profile fade-in">
    <div class="profile__banner"${banner ? ` style="background-image:url('${banner}')"` : ''}>
      <button class="profile__edit-banner" id="editBannerBtn" title="Change background">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M15.2 5.2l3.6 3.6-11 11H4v-3.6l11.2-11zM13 7.4l3.6 3.6"/></svg>
        Change background
      </button>
    </div>
    <div class="profile__body">
      <div class="profile__avatar-wrap">
        <div class="profile__avatar" id="profileAvatar"
          style="${avatar ? `background-image:url('${avatar}')` : ''}">
          ${avatar ? '' : '🎬'}
        </div>
        <button class="profile__avatar-edit" id="editAvatarBtn" title="Change avatar" aria-label="Change avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><path d="M15.2 5.2l3.6 3.6-11 11H4v-3.6l11.2-11z"/></svg>
        </button>
      </div>
      <div class="profile__meta">
        <div class="profile__name">
          <span id="profileUsername">${esc(profile.username)}</span>
          <button class="edit-name" id="editNameBtn" title="Edit name" aria-label="Edit username">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:18px;height:18px"><path d="M15.2 5.2l3.6 3.6-11 11H4v-3.6l11.2-11z"/></svg>
          </button>
        </div>
        <div class="profile__handle">@${esc(profile.handle)} · Your stash</div>
        <div class="profile__bio" id="profileBio">${esc(profile.bio)}</div>
      </div>
      <div class="profile__stats">
        <div class="stat"><div class="stat__num">${s.films}</div><div class="stat__label">Films</div></div>
        <div class="stat"><div class="stat__num">${s.thisYear}</div><div class="stat__label">This Year</div></div>
        <div class="stat"><div class="stat__num">${s.watchlist}</div><div class="stat__label">Watchlist</div></div>
      </div>
    </div>
  </div>
  <input type="file" accept="image/*" id="bannerFileInput" style="display:none">
  <input type="file" accept="image/*" id="avatarFileInput" style="display:none">`;
}

function section(title, id, content) {
  return `
  <div class="section fade-in">
    <div class="section__head">
      <h2 class="section__title"><span class="marquee-bullet"></span>${title}</h2>
    </div>
    ${content}
  </div>`;
}

function emptyFavs() {
  return `<div class="empty">
    <div class="empty__icon">◆</div>
    <div class="empty__title">No favorites yet</div>
    <div class="empty__text">Search for a film and star it as a favorite to build your personal top picks.</div>
  </div>`;
}

function emptyRecent() {
  return `<div class="empty">
    <div class="empty__icon">🎬</div>
    <div class="empty__title">Your stash is empty</div>
    <div class="empty__text">Search for a film and log it to start building your CINESTASH.</div>
  </div>`;
}

function noKeyBanner() {
  return `<div class="no-key-banner callout" style="margin-top:16px">
    <strong>Add your free TMDB API key</strong> in <button class="btn btn--sm btn--ghost" id="openSettingsFromHome" style="padding:4px 8px;display:inline-flex">Settings</button> to browse trending films and search the entire movie database.
  </div>`;
}

/* ── profile editing ─────────────────────────────────── */
function bindProfileEdits() {
  /* banner */
  document.getElementById('editBannerBtn')?.addEventListener('click', () =>
    document.getElementById('bannerFileInput')?.click());
  document.getElementById('bannerFileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    updateProfile({ background: url });
    document.querySelector('.profile__banner').style.backgroundImage = `url('${url}')`;
    toast('Background updated', '🖼');
  });

  /* avatar */
  document.getElementById('editAvatarBtn')?.addEventListener('click', () =>
    document.getElementById('avatarFileInput')?.click());
  document.getElementById('avatarFileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    updateProfile({ avatar: url });
    const av = document.getElementById('profileAvatar');
    av.style.backgroundImage = `url('${url}')`;
    av.textContent = '';
    toast('Avatar updated', '✓');
  });

  /* username inline edit */
  const editNameBtn = document.getElementById('editNameBtn');
  editNameBtn?.addEventListener('click', () => {
    const nameEl = document.getElementById('profileUsername');
    const current = nameEl.textContent;
    nameEl.innerHTML = `<input id="nameEditInput" class="input" value="${esc(current)}" style="width:200px;padding:6px 10px;font-size:24px;font-weight:900">`;
    const inp = document.getElementById('nameEditInput');
    inp?.focus();
    inp?.select();
    const save = () => {
      const v = inp.value.trim() || current;
      updateProfile({ username: v });
      nameEl.innerHTML = esc(v);
      toast('Name updated', '✓');
    };
    inp?.addEventListener('blur', save);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  });

  /* settings quick link from home */
  document.getElementById('openSettingsFromHome')?.addEventListener('click', () =>
    document.getElementById('settingsBtn')?.click());
}

/* ── card click delegation ───────────────────────────── */
export function bindCardEvents(root) {
  root.addEventListener('click', async e => {
    // log quick-button
    const logBtn = e.target.closest('[data-action="log"]');
    if (logBtn) {
      e.stopPropagation();
      const id = parseInt(logBtn.dataset.id);
      // find movie from the card
      const card = logBtn.closest('.card');
      const movieId = parseInt(card.dataset.movieId);
      const movieTitle = card.querySelector('.card__title')?.textContent || '';
      const movieYear  = card.querySelector('.card__sub')?.textContent?.split(' ◆')[0] || '';
      const imgStyle   = card.querySelector('.card__poster')?.style.backgroundImage || '';
      const posterPath = imgStyle.match(/url\('.*?(\/.+?)'\)/)?.[1] || '';
      openLogForm({ id: movieId, title: movieTitle, year: movieYear, poster: posterPath });
      return;
    }
    // watchlist quick-button
    const wlBtn = e.target.closest('[data-action="watchlist"]');
    if (wlBtn) {
      e.stopPropagation();
      const card = wlBtn.closest('.card');
      const movieId    = parseInt(card.dataset.movieId);
      const movieTitle = card.querySelector('.card__title')?.textContent || '';
      const movieYear  = card.querySelector('.card__sub')?.textContent?.split(' ◆')[0] || '';
      const imgStyle   = card.querySelector('.card__poster')?.style.backgroundImage || '';
      const posterPath = imgStyle.match(/url\('.*?(\/.+?)'\)/)?.[1] || '';
      const added = toggleWatchlist({ id: movieId, title: movieTitle, year: movieYear, poster: posterPath });
      toast(added ? 'Added to watchlist 🔖' : 'Removed from watchlist', added ? '🔖' : '✓');
      window.dispatchEvent(new CustomEvent('cinestash:change'));
      return;
    }
    // open detail on card click
    const card = e.target.closest('.card');
    if (card) {
      const id = parseInt(card.dataset.movieId);
      const title = card.querySelector('.card__title')?.textContent || '';
      const year  = card.querySelector('.card__sub')?.textContent?.split(' ◆')[0] || '';
      const imgStyle = card.querySelector('.card__poster')?.style.backgroundImage || '';
      const posterPath = imgStyle.match(/url\('.*?(\/.+?)'\)/)?.[1] || '';
      openDetail({ id, title, year, poster: posterPath });
    }
  });
  root.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
      e.preventDefault();
      e.target.click();
    }
  });
}
