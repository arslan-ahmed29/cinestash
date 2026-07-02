/* ░░ pages/diary.js — Full viewing diary ░░ */

import { getLogs, getLogFor, deleteLog, stats } from '../storage.js?v=cb6';
import { poster } from '../api.js?v=cb6';
import { starsHtml, toast, esc } from '../ui.js?v=cb6';
import { openDetail } from '../detail.js?v=cb6';
import { openLogForm } from '../logform.js?v=cb6';
import { openSearchPicker } from '../searchpicker.js?v=cb6';

export function renderDiary(app) {
  const logs = getLogs();
  const s = stats();

  app.innerHTML = `
  <div class="page-head page-head--row fade-in">
    <div>
      <h1 class="page-head__title">Diary</h1>
      <p class="page-head__sub">${s.total} log${s.total !== 1 ? 's' : ''} · ${s.films} unique film${s.films !== 1 ? 's' : ''} · ${s.thisYear} this year</p>
    </div>
    <button class="add-btn" id="addToDiaryBtn" aria-label="Log a film" title="Log a film">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  </div>
  ${logs.length ? diaryHtml(logs) : emptyState()}`;

  document.getElementById('addToDiaryBtn')?.addEventListener('click', openDiaryPicker);
  document.getElementById('diaryEmptyAdd')?.addEventListener('click', openDiaryPicker);

  app.addEventListener('click', e => {
    const delBtn = e.target.closest('.diary__del');
    if (delBtn) {
      e.stopPropagation();
      const logId = delBtn.dataset.logId;
      if (!logId) return;
      if (!confirm('Delete this log entry?')) return;
      deleteLog(logId);
      delBtn.closest('.diary__row')?.remove();
      toast('Log deleted', '🗑');
      window.dispatchEvent(new CustomEvent('cinestash:change'));
      return;
    }

    const editBtn = e.target.closest('.diary__edit');
    if (editBtn) {
      e.stopPropagation();
      const row = editBtn.closest('.diary__row');
      const movie = movieFromRow(row);
      const existing = getLogFor(movie.id);
      openLogForm(movie, existing);
      return;
    }

    const row = e.target.closest('.diary__row[data-movie-id]');
    if (row) openDetail(movieFromRow(row));
  });
}

function movieFromRow(row) {
  return {
    id:     row.dataset.movieId || '',
    title:  row.querySelector('.diary__title-text')?.textContent || '',
    year:   row.dataset.year || '',
    poster: row.dataset.poster || '',
  };
}

function openDiaryPicker() {
  openSearchPicker({
    title: 'Log a film',
    hint: 'Search a film you watched…',
    onPick: (movie) => openLogForm(movie, getLogFor(movie.id)),
  });
}

function diaryHtml(logs) {
  let lastMonth = null;
  let html = '<div class="diary fade-in">';

  for (const log of logs) {
    const d = new Date(log.watchedDate || log.loggedAt);
    const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const day   = d.getDate();
    const mon   = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const imgP  = log.movie.poster ? poster(log.movie.poster, 'w92') : '';
    const stars = log.rating ? starsHtml(log.rating) : '';

    if (month !== lastMonth) {
      html += `<div style="color:var(--faint);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:6px 0 4px">${month}</div>`;
      lastMonth = month;
    }

    html += `
    <div class="diary__row" data-movie-id="${log.movie.id}" data-year="${esc(log.movie.year)}" data-poster="${esc(log.movie.poster || '')}" role="button" tabindex="0" aria-label="${esc(log.movie.title)}">
      <div class="diary__date">
        <div class="diary__day">${day}</div>
        <div class="diary__mon">${mon}</div>
      </div>
      ${imgP ? `<div class="diary__poster" style="background-image:url('${imgP}')"></div>` : '<div class="diary__poster" style="background-color:#232338"></div>'}
      <div class="diary__main">
        <div class="diary__title">
          <span class="diary__title-text">${esc(log.movie.title)}</span>
          <span>${log.movie.year || ''}</span>
          ${log.rewatch ? '<span style="color:var(--accent);font-size:11px;margin-left:6px;font-weight:700">↺ rewatch</span>' : ''}
        </div>
        ${log.review ? `<div class="diary__review">${esc(log.review)}</div>` : ''}
      </div>
      <div class="diary__stars">${stars || '<span class="diary__norating">Not rated</span>'}</div>
      <button class="diary__edit" title="Edit rating & review" aria-label="Edit log for ${esc(log.movie.title)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="diary__del" data-log-id="${log.id}" title="Delete log" aria-label="Delete log for ${esc(log.movie.title)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`;
  }

  html += '</div>';
  return html;
}

function emptyState() {
  return `<div class="empty fade-in">
    <div class="empty__icon">📔</div>
    <div class="empty__title">Your diary is empty</div>
    <div class="empty__text">Every film you log — with your ★ rating and review — appears here in order, like a personal film diary.</div>
    <button class="btn btn--primary" id="diaryEmptyAdd">+ Log your first film</button>
  </div>`;
}
