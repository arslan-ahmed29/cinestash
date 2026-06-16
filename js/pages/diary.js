/* ░░ pages/diary.js — Full viewing diary ░░ */

import { getLogs, deleteLog, stats } from '../storage.js';
import { poster } from '../api.js';
import { starsHtml, toast, esc } from '../ui.js';
import { openDetail } from '../detail.js';
import { openLogForm } from '../logform.js';

export function renderDiary(app) {
  const logs = getLogs();
  const s = stats();

  app.innerHTML = `
  <div class="page-head fade-in">
    <h1 class="page-head__title">Diary</h1>
    <p class="page-head__sub">${s.total} log${s.total !== 1 ? 's' : ''} · ${s.films} unique film${s.films !== 1 ? 's' : ''} · ${s.thisYear} this year</p>
  </div>
  ${logs.length ? diaryHtml(logs) : emptyState()}`;

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

    const row = e.target.closest('.diary__row[data-movie-id]');
    if (row) {
      const id    = parseInt(row.dataset.movieId);
      const title = row.querySelector('.diary__title-text')?.textContent || '';
      const year  = row.dataset.year || '';
      const p     = row.dataset.poster || '';
      openDetail({ id, title, year, poster: p });
    }
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
      <div class="diary__stars">${stars}</div>
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
    <div class="empty__text">Every film you log will appear here in order, like a personal film diary.</div>
  </div>`;
}
