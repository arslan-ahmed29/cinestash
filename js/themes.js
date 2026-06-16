/* ░░ themes.js — light / dark mode ░░ */

const KEY = 'cinestash:theme';
const html = document.documentElement;

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved || system);
}

export function toggleTheme() {
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(KEY, next);
}

export function getTheme() {
  return html.dataset.theme || 'light';
}

function applyTheme(theme) {
  html.dataset.theme = theme;
  updateToggleBtn(theme);
}

export function updateToggleBtn(theme) {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  if (theme === 'dark') {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}
