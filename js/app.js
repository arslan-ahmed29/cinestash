/* ░░ app.js — router + bootstrap ░░ */

import { renderHome } from './pages/home.js';
import { renderWatchlist } from './pages/watchlist.js';
import { renderDiary } from './pages/diary.js';
import { renderSearch } from './pages/search.js';
import { openSettings } from './settings.js';
import { openDetail } from './detail.js';
import { initNavSearch } from './navsearch.js';

const app = document.getElementById('app');

/* ── router ─────────────────────────────────────────── */
const ROUTES = {
  '/':          renderHome,
  '/watchlist': renderWatchlist,
  '/diary':     renderDiary,
};

async function navigate(hash) {
  // strip leading #
  const path = (hash || '#/').replace(/^#/, '') || '/';

  // search?
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
    // unknown → home
    window.location.hash = '#/';
  }
}

function setActiveNav(path) {
  document.querySelectorAll('.nav__link[data-route]').forEach(el => {
    const route = el.dataset.route;
    const matches = (route === 'home' && (path === '/' || !path)) ||
                    (route !== 'home' && path === `/${route}`);
    el.classList.toggle('is-active', matches);
  });
}

/* ── nav search integration ──────────────────────────── */
initNavSearch(
  movie => openDetail(movie),
  query => {
    window.location.hash = `#/search?q=${encodeURIComponent(query)}`;
  }
);

/* ── hash routing ───────────────────────────────────── */
window.addEventListener('hashchange', () => navigate(window.location.hash));
navigate(window.location.hash);

/* ── cinestash:change → re-render current view ──────── */
window.addEventListener('cinestash:change', () => {
  navigate(window.location.hash);
});

/* ── settings button ─────────────────────────────────── */
document.getElementById('settingsBtn')?.addEventListener('click', openSettings);

/* ── SPA link handler ─────────────────────────────────── */
document.body.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (href) window.location.hash = href.startsWith('#') ? href : `#${href}`;
  }
});

/* ── scroll to top on navigation ─────────────────────── */
window.addEventListener('hashchange', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
