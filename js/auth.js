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
      <span class="user-name">${escHtml(user.username)}</span>
      <span class="role-badge ${user.role}">${user.role}</span>
    </span>
    ${user.role === 'admin' ? '<a href="admin.html" id="nav-admin">Admin</a>' : ''}
    <button id="logout-btn">Déconnexion</button>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
