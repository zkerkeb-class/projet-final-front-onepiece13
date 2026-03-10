/**
 * auth.js — Gestion des routes protégées côté front
 *
 * Utilisation :
 *   import { guardAuth, guardAdmin, renderUserBar } from './auth.js';
 *   guardAuth();          // redirige vers login.html si pas de token
 *   guardAdmin();         // redirige si pas admin
 *   renderUserBar();      // affiche le nom + bouton déconnexion dans le header
 */

import { getToken, getUser, logout } from './api.js';

function readStats(username) {
  const raw = localStorage.getItem(`op_stats_${username}`);
  return raw ? JSON.parse(raw) : { found: 0, totalAttempts: 0, bestScore: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

/** Redirige vers login.html si aucun token n'est présent. */
export function guardAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

/** Redirige vers index.html si l'utilisateur n'est pas admin. */
export function guardAdmin() {
  guardAuth();
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User bar (injectée dans le <header> de chaque page protégée)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insère la barre utilisateur (nom + rôle + liens + déconnexion) dans l'élément
 * identifié par `containerId` (par défaut "user-bar").
 */
export function renderUserBar(containerId = 'user-bar') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const user = getUser();
  if (!user) return;

  el.innerHTML = `
    <span class="user-info">
      <button class="user-name-btn" id="user-name-btn" title="Voir mes stats">${escHtml(user.username)}</button>
      <span class="role-badge ${user.role}">${user.role}</span>
    </span>
    <button id="logout-btn">Déconnexion</button>
  `;

  document.getElementById('user-name-btn').addEventListener('click', () => showStatsModal(user));

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Modal
// ─────────────────────────────────────────────────────────────────────────────
function showStatsModal(user) {
  const existing = document.getElementById('stats-modal-overlay');
  if (existing) { existing.remove(); return; }

  const s = readStats(user.username);
  const avg = s.found > 0 ? (s.totalAttempts / s.found).toFixed(1) : '—';

  const overlay = document.createElement('div');
  overlay.id = 'stats-modal-overlay';
  overlay.innerHTML = `
    <div class="stats-modal">
      <button class="stats-close" id="stats-close">✕</button>
      <h2>📊 ${escHtml(user.username)}</h2>
      <span class="role-badge ${user.role} modal-badge">${user.role}</span>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${s.found}</span>
          <span class="stat-label">Personnages trouvés</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${s.totalAttempts}</span>
          <span class="stat-label">Tentatives totales</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${s.bestScore ?? '—'}</span>
          <span class="stat-label">Meilleur score</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${avg}</span>
          <span class="stat-label">Moy. tentatives / victoire</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'stats-close') overlay.remove();
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
