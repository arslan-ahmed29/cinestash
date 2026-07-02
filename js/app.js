/* ░░ app.js — router + bootstrap ░░ */

import { initTheme, toggleTheme, updateToggleBtn } from './themes.js?v=cb2';
import { renderHome } from './pages/home.js?v=cb2';
import { renderWatchlist } from './pages/watchlist.js?v=cb2';
import { renderDiary } from './pages/diary.js?v=cb2';
import { renderSearch } from './pages/search.js?v=cb2';
import { renderFriends } from './pages/friends.js?v=cb2';
import { renderTheaters } from './pages/theaters.js?v=cb2';
import { openSettings } from './settings.js?v=cb2';
import { openDetail } from './detail.js?v=cb2';
import { initNavSearch } from './navsearch.js?v=cb2';

const app = document.getElementById('app');

/* ── Theme ──────────────────────────────────────── */
initTheme();

/* ── Router ─────────────────────────────────────── */
const ROUTES = {
  '/':          renderHome,
  '/friends':   renderFriends,
  '/theaters':  renderTheaters,
  '/watchlist': renderWatchlist,
  '/diary':     renderDiary,
};

async function navigate(hash) {
  const path = (hash || '#/').replace(/^#/, '') || '/';

  const searchMatch = path.match(/^\/search\?q=(.+)/);
  if (searchMatch) {
    const query = decodeURIComponent(searchMatch[1]);
    setActiveNav(null);
    await renderSearch(app, query);
    return;
  }

  const renderer = ROUTES[path];
  if (renderer) {
    setActiveNav(path);
    await renderer(app);
  } else {
    window.location.hash = '#/';
  }
}

function setActiveNav(path) {
  document.querySelectorAll('.nav__link[data-route]').forEach(el => {
    const route   = el.dataset.route;
    const matches = (route === 'home'    && (path === '/' || !path)) ||
                    (route === 'friends'  && path === '/friends') ||
                    (route === 'theaters' && path === '/theaters') ||
                    (route === 'watchlist'&& path === '/watchlist') ||
                    (route === 'diary'    && path === '/diary');
    el.classList.toggle('is-active', matches);
  });
}

/* ── Nav search ──────────────────────────────────── */
initNavSearch(
  movie => openDetail(movie),
  query => { window.location.hash = `#/search?q=${encodeURIComponent(query)}`; }
);

/* ── Routing events ──────────────────────────────── */
window.addEventListener('hashchange', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate(window.location.hash); });
navigate(window.location.hash);

/* ── Re-render on data change ────────────────────── */
window.addEventListener('cinestash:change', () => navigate(window.location.hash));

/* ── Buttons ─────────────────────────────────────── */
document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
document.getElementById('themeBtn')?.addEventListener('click', () => {
  toggleTheme();
  updateToggleBtn(document.documentElement.dataset.theme);
});

/* ── SPA link handler ────────────────────────────── */
document.body.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (href) window.location.hash = href.startsWith('#') ? href : `#${href}`;
  }
});
