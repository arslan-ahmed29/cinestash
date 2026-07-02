/* ░░ detail.js — movie detail modal + hot takes ░░ */

import { details, poster, backdrop } from './api.js?v=cb5';
import { getLogFor, getAllLogsFor, toggleWatchlist, toggleFavorite,
         isWatchlisted, isFavorite, getHotTakes, addHotTake, voteHotTake } from './storage.js?v=cb5';
import { openModal, closeModal, toast, starsHtml, esc } from './ui.js?v=cb5';
import { openLogForm } from './logform.js?v=cb5';
import { hamzahTrackerHtml, bindHamzahTrackers } from './hamzahtracker.js?v=cb5';

export async function openDetail(movie) {
  openModal(skeletonHtml(movie));
  bindClose();
  let m = movie;
  try { m = await details(movie.id); } catch { /* use slim data */ }
  renderDetail(m);
}

function renderDetail(m) {
  const logged  = getLogFor(m.id);
  const allLogs = getAllLogsFor(m.id);
  const wl  = isWatchlisted(m.id);
  const fav = isFavorite(m.id);
  const imgP = m.poster   ? poster(m.poster, 'w342')  : '';
  const imgB = m.backdrop ? backdrop(m.backdrop)       : '';

  const loggedBlock = logged ? `
    <div class="detail__logged">
      <div class="detail__logged-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><path d="M20 6L9 17l-5-5"/></svg>
        In your stash${allLogs.length > 1 ? ` · ${allLogs.length}× watched` : ''}
      </div>
      ${logged.rating ? `<div class="detail__logged-stars">${starsHtml(logged.rating)}</div>` : ''}
      ${logged.review ? `<div class="detail__logged-review">"${esc(logged.review)}"</div>` : ''}
      <div class="detail__logged-date">Watched ${fmtDate(logged.watchedDate)}</div>
      ${hamzahTrackerHtml(logged.id, logged.hamzahLate || 0)}
    </div>` : '';

  const genreChips = (m.genres || []).map(g => `<span class="chip chip--genre">${esc(g)}</span>`).join('');
  const facts = [
    m.year        && `<span class="chip">${esc(m.year)}</span>`,
    m.voteAverage && `<span class="chip chip--rating">★ ${m.voteAverage.toFixed(1)}</span>`,
    m.runtime     && `<span class="chip">${m.runtime} min</span>`,
    m.director    && `<span class="chip">Dir. ${esc(m.director)}</span>`,
  ].filter(Boolean).join('') + genreChips;

  document.getElementById('modalPanel').innerHTML = `
    <div class="detail__hero">
      <div class="detail__backdrop" style="${imgB ? `background-image:url('${imgB}')` : ''}"></div>
      <button class="detail__close" id="detailClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="detail__top">
        <div class="detail__poster" style="${imgP ? `background-image:url('${imgP}')` : ''}"></div>
        <div class="detail__info">
          <h2 class="detail__title">${esc(m.title)}</h2>
          ${m.tagline ? `<div class="detail__tagline">"${esc(m.tagline)}"</div>` : ''}
          <div class="detail__facts">${facts}</div>
          <div class="detail__actions">
            <button class="btn btn--primary" id="detailLog">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>
              ${logged ? 'Edit log' : 'Log film'}
            </button>
            <button class="btn ${wl ? 'btn--tinted' : ''}" id="detailWl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="width:14px;height:14px"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              ${wl ? 'Saved' : 'Watchlist'}
            </button>
            <button class="btn ${fav ? 'btn--gold-tinted' : ''}" id="detailFav">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${fav ? 'Favorited' : 'Favorite'}
            </button>
          </div>
          ${loggedBlock}
        </div>
      </div>
    </div>
    <div class="detail__body">
      ${m.overview ? `<p class="detail__overview">${esc(m.overview)}</p>` : ''}
      ${m.cast?.length ? `<p style="margin-top:12px;font-size:13px;color:var(--label-3)">Cast: ${m.cast.map(esc).join(', ')}</p>` : ''}
    </div>
    ${hotTakesSectionHtml(m.id)}`;

  bindClose();
  bindDetailActions(m, logged);
  bindHotTakes(m.id);
  bindHamzahTrackers(document.getElementById('modalPanel'));
}

/* ── Hot Takes ──────────────────────────────────── */
function hotTakesSectionHtml(movieId) {
  const takes = getHotTakes(movieId);
  return `
  <div class="hot-takes" id="hotTakesSection">
    <div class="hot-takes__head">
      <div class="hot-takes__title">
        Saqib's Hot Takes 🌶️
        ${takes.length ? `<span class="hot-takes__badge">${takes.length}</span>` : ''}
      </div>
      <button class="btn btn--ghost btn--sm" id="showTakeFormBtn">+ Drop a Take</button>
    </div>
    <div id="hotTakesList">${renderTakesList(takes, movieId)}</div>
    <div class="take-form" id="takeForm" style="display:none">
      <textarea class="take-form__area" id="takeText" placeholder="Say what you really think about this film…" maxlength="280"></textarea>
      <div class="take-form__actions">
        <div class="spice-picker">
          <span class="spice-picker__label">Heat:</span>
          ${[1,2,3,4,5].map(i => `<span class="spice-pip" data-val="${i}" role="button" tabindex="0" aria-label="${i} chili">🌶️</span>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn--ghost btn--sm" id="cancelTakeBtn">Cancel</button>
          <button class="btn btn--primary btn--sm" id="submitTakeBtn">Post</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderTakesList(takes, movieId) {
  if (!takes.length) return `<div class="hot-takes__empty">Saqib hasn't roasted this one yet 🌶️ — drop your own take below.</div>`;
  return takes.map(t => `
  <div class="take-card" data-take-id="${t.id}">
    <div class="take-card__header">
      <span class="take-card__user">@${esc(t.username)}</span>
      <span class="take-card__spice">${'🌶️'.repeat(t.spice)}</span>
    </div>
    <p class="take-card__text">"${esc(t.text)}"</p>
    <div class="take-card__votes">
      <button class="take-card__vote-btn" data-vote="agree" data-movie="${movieId}" data-take="${t.id}">
        💀 Agree <strong>${t.agrees}</strong>
      </button>
      <button class="take-card__vote-btn" data-vote="disagree" data-movie="${movieId}" data-take="${t.id}">
        🤡 No way <strong>${t.disagrees}</strong>
      </button>
    </div>
  </div>`).join('');
}

function bindHotTakes(movieId) {
  let selectedSpice = 3;

  // show/hide form
  document.getElementById('showTakeFormBtn')?.addEventListener('click', () => {
    const form = document.getElementById('takeForm');
    if (form) { form.style.display = form.style.display === 'none' ? 'block' : 'none'; }
    document.getElementById('takeText')?.focus();
  });
  document.getElementById('cancelTakeBtn')?.addEventListener('click', () => {
    const form = document.getElementById('takeForm');
    if (form) form.style.display = 'none';
  });

  // spice picker
  const pips = document.querySelectorAll('.spice-pip');
  function setSpice(val) {
    selectedSpice = val;
    pips.forEach((p, i) => p.classList.toggle('is-on', i < val));
  }
  setSpice(3);
  pips.forEach(p => {
    p.addEventListener('click', () => setSpice(parseInt(p.dataset.val)));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') setSpice(parseInt(p.dataset.val)); });
  });

  // submit
  document.getElementById('submitTakeBtn')?.addEventListener('click', () => {
    const text = document.getElementById('takeText')?.value.trim();
    if (!text) { toast('Write your take first', '⚠️'); return; }
    const username = JSON.parse(localStorage.getItem('cinestash:v1') || '{}')?.profile?.handle || 'you';
    addHotTake(movieId, { username, text, spice: selectedSpice });
    const list = document.getElementById('hotTakesList');
    if (list) list.innerHTML = renderTakesList(getHotTakes(movieId), movieId);
    const form = document.getElementById('takeForm');
    if (form) { form.style.display = 'none'; }
    const textarea = document.getElementById('takeText');
    if (textarea) textarea.value = '';
    toast('Take dropped 🌶️', '🌶️');
    bindVotes(movieId);
    // update badge
    const badge = document.querySelector('.hot-takes__badge');
    if (badge) badge.textContent = getHotTakes(movieId).length;
    const titleEl = document.querySelector('.hot-takes__title');
    if (titleEl && !badge) titleEl.insertAdjacentHTML('beforeend', `<span class="hot-takes__badge">1</span>`);
  });

  bindVotes(movieId);
}

function bindVotes(movieId) {
  document.querySelectorAll('.take-card__vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const vote  = btn.dataset.vote;
      const takeId= btn.dataset.take;
      voteHotTake(movieId, takeId, vote);
      btn.classList.add('is-voted');
      const strong = btn.querySelector('strong');
      if (strong) strong.textContent = parseInt(strong.textContent) + 1;
      btn.disabled = true;
      toast(vote === 'agree' ? 'We see you 💀' : 'Controversial stance 🤡', vote === 'agree' ? '💀' : '🤡');
    });
  });
}

/* ── Detail action buttons ──────────────────────── */
function bindDetailActions(m, logged) {
  document.getElementById('detailLog')?.addEventListener('click', () => { closeModal(); openLogForm(m, logged); });

  document.getElementById('detailWl')?.addEventListener('click', e => {
    const added = toggleWatchlist(m);
    const btn = e.currentTarget;
    btn.classList.toggle('btn--tinted', added);
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" style="width:14px;height:14px"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> ${added ? 'Saved' : 'Watchlist'}`;
    toast(added ? 'Added to watchlist' : 'Removed from watchlist', added ? '🔖' : '✓');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('detailFav')?.addEventListener('click', e => {
    const result = toggleFavorite(m);
    if (result === 'full') { toast('Favorites full (max 8)', '⚠️'); return; }
    const btn = e.currentTarget;
    btn.classList.toggle('btn--gold-tinted', !!result);
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${result ? 'Favorited' : 'Favorite'}`;
    toast(result ? 'Added to favorites ⭐' : 'Removed from favorites', result ? '⭐' : '✓');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });
}

/* ── Helpers ────────────────────────────────────── */
function skeletonHtml(m) {
  return `
    <div class="detail__hero">
      <div class="detail__backdrop" style="background:linear-gradient(135deg,#1a1a2e,#0f3460)"></div>
      <button class="detail__close" id="detailClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="detail__top">
        <div class="detail__poster skeleton" style="${m.poster ? `background-image:url('${m.poster}')` : ''}"></div>
        <div class="detail__info" style="padding-top:44px">
          <h2 class="detail__title">${esc(m.title)}</h2>
          <div class="detail__facts"><span class="chip">${m.year || ''}</span></div>
        </div>
      </div>
    </div>
    <div class="detail__body"><div class="loader"><div class="loader__ring"></div></div></div>`;
}

function bindClose() { document.getElementById('detailClose')?.addEventListener('click', closeModal); }

function fmtDate(s) {
  try { return new Date(s).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); } catch { return s; }
}
