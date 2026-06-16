/* ░░ navsearch.js — live search dropdown in the navbar ░░ */

import { search } from './api.js';
import { poster } from './api.js';
import { esc } from './ui.js';

export function initNavSearch(onSelect, onEnter) {
  const form    = document.getElementById('navSearch');
  const input   = document.getElementById('navSearchInput');
  if (!input) return;

  /* lazy-create dropdown */
  let pop = null;
  function getPopup() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'search-pop';
    pop.id = 'searchPop';
    form.style.position = 'relative';
    form.appendChild(pop);
    return pop;
  }

  let debounce;
  let lastQuery = '';
  let selIdx = -1;
  let results = [];

  function closePop() {
    if (pop) pop.classList.remove('is-open');
    selIdx = -1;
  }

  function renderResults(movies, query) {
    const p = getPopup();
    results = movies;
    selIdx = -1;
    if (!movies.length) { closePop(); return; }
    p.innerHTML = movies.slice(0, 7).map((m, i) => {
      const imgUrl = m.poster || '';
      return `<div class="search-pop__item" data-idx="${i}" role="option" aria-selected="false">
        <div class="search-pop__poster" style="${imgUrl ? `background-image:url('${imgUrl}')` : 'background-color:#232338'}"></div>
        <div>
          <div class="search-pop__title">${esc(m.title)}</div>
          <div class="search-pop__year">${m.year || ''}</div>
        </div>
      </div>`;
    }).join('') + `<div class="search-pop__foot">↵ Enter to see all results for "${esc(query)}"</div>`;
    p.classList.add('is-open');
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(debounce);
    if (!q) { closePop(); return; }
    debounce = setTimeout(async () => {
      try {
        const movies = await search(q);
        if (input.value.trim() === q) renderResults(movies, q);
      } catch {
        closePop();
      }
    }, 280);
  });

  input.addEventListener('keydown', e => {
    const p = getPopup();
    const items = p.querySelectorAll('.search-pop__item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selIdx = Math.min(selIdx + 1, items.length - 1);
      updateSel(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selIdx = Math.max(selIdx - 1, -1);
      updateSel(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selIdx >= 0 && results[selIdx]) {
        onSelect(results[selIdx]);
        closePop();
        input.value = '';
      } else if (input.value.trim()) {
        onEnter(input.value.trim());
        closePop();
        input.value = '';
      }
    } else if (e.key === 'Escape') {
      closePop();
      input.blur();
    }
  });

  function updateSel(items) {
    items.forEach((el, i) => {
      el.classList.toggle('is-sel', i === selIdx);
      el.setAttribute('aria-selected', i === selIdx);
    });
  }

  document.addEventListener('click', e => {
    if (!form.contains(e.target)) closePop();
  });

  form.addEventListener('click', e => {
    const item = e.target.closest('.search-pop__item');
    if (item) {
      const idx = parseInt(item.dataset.idx);
      if (results[idx]) {
        onSelect(results[idx]);
        closePop();
        input.value = '';
      }
    }
  });

  /* keyboard shortcut: / focuses search */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
