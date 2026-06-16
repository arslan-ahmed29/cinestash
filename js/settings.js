/* ░░ settings.js — API key + profile settings modal ░░ */

import { getSettings, getProfile, updateSettings, updateProfile, exportData, importData, wipe } from './storage.js';
import { openModal, closeModal, toast, esc, fileToDataUrl } from './ui.js';
import { hasKey } from './api.js';

export function openSettings() {
  const s = getSettings();
  const p = getProfile();
  const keyOk = hasKey();

  openModal(`
  <div class="dialog">
    <h2 class="dialog__title">Settings</h2>
    <p class="dialog__sub">Your data lives entirely in your browser — no account needed.</p>

    <h3 style="font-size:14px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">TMDB API Key</h3>
    <div class="callout">
      <strong>Why do I need this?</strong> CINESTASH uses The Movie Database (TMDB) to power search and trending. Get a free key at
      <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">themoviedb.org/settings/api</a> — takes 2 minutes, completely free.
    </div>
    <div class="field">
      <label class="field__label" for="tmdbKeyInput">API Key (v3 auth)
        <span style="margin-left:8px">
          <span class="status-dot ${keyOk ? 'status-dot--ok' : 'status-dot--off'}"></span>
          ${keyOk ? 'Connected' : 'Not set'}
        </span>
      </label>
      <div style="display:flex;gap:8px">
        <input class="input" type="password" id="tmdbKeyInput" placeholder="Paste your TMDB API key…" value="${esc(s.tmdbKey || '')}" style="flex:1">
        <button class="btn" id="toggleKeyVisibility" title="Show/hide key">👁</button>
      </div>
    </div>
    <button class="btn btn--primary" id="saveKeyBtn" style="margin-bottom:28px">Save key</button>

    <h3 style="font-size:14px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">Profile</h3>
    <div class="field">
      <label class="field__label" for="settingsUsername">Display name</label>
      <input class="input" id="settingsUsername" value="${esc(p.username)}">
    </div>
    <div class="field">
      <label class="field__label" for="settingsHandle">Handle</label>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="color:var(--muted)">@</span>
        <input class="input" id="settingsHandle" value="${esc(p.handle)}" style="flex:1">
      </div>
    </div>
    <div class="field">
      <label class="field__label" for="settingsBio">Bio</label>
      <textarea class="textarea" id="settingsBio" style="min-height:70px">${esc(p.bio)}</textarea>
    </div>
    <button class="btn btn--primary" id="saveProfileBtn" style="margin-bottom:28px">Save profile</button>

    <h3 style="font-size:14px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">Data</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" id="exportBtn">Export backup</button>
      <label class="btn" style="cursor:pointer">Import backup<input type="file" accept=".json" id="importInput" style="display:none"></label>
      <button class="btn" id="wipeBtn" style="color:var(--brand)">Wipe all data</button>
    </div>

    <div style="margin-top:28px;text-align:right">
      <button class="btn" id="settingsCloseBtn">Close</button>
    </div>
  </div>`);

  /* toggle key visibility */
  const keyInput = document.getElementById('tmdbKeyInput');
  document.getElementById('toggleKeyVisibility')?.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('saveKeyBtn')?.addEventListener('click', () => {
    const key = keyInput.value.trim();
    updateSettings({ tmdbKey: key });
    toast(key ? 'API key saved ✓' : 'API key cleared', '🔑');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    updateProfile({
      username: document.getElementById('settingsUsername').value.trim() || p.username,
      handle:   document.getElementById('settingsHandle').value.trim() || p.handle,
      bio:      document.getElementById('settingsBio').value.trim(),
    });
    toast('Profile updated', '✓');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cinestash-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast('Backup downloaded', '💾');
  });

  document.getElementById('importInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importData(text);
      closeModal();
      toast('Backup imported ✓', '✓');
      window.dispatchEvent(new CustomEvent('cinestash:change'));
    } catch {
      toast('Invalid backup file', '⚠️');
    }
  });

  document.getElementById('wipeBtn')?.addEventListener('click', () => {
    if (!confirm('Wipe ALL your CINESTASH data? This cannot be undone.')) return;
    if (!confirm('Really? Everything — logs, watchlist, favorites — will be deleted.')) return;
    wipe();
    closeModal();
    toast('All data cleared', '🗑');
    window.dispatchEvent(new CustomEvent('cinestash:change'));
  });

  document.getElementById('settingsCloseBtn')?.addEventListener('click', closeModal);
}
