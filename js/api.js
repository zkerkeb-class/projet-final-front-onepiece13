/** Central config — change the port if needed */
export const API_BASE = 'http://localhost:3001/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken  = () => localStorage.getItem('op_token');
export const getUser   = () => JSON.parse(localStorage.getItem('op_user') || 'null');
export const saveAuth  = (token, user) => {
  localStorage.setItem('op_token', token);
  localStorage.setItem('op_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('op_token');
  localStorage.removeItem('op_user');
};

// ── Core fetch wrapper — attaches token, handles 401 ─────────────────────────
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  // Bonus: 401 reçu → déconnecter l'utilisateur et rediriger
  if (res.status === 401) {
    clearAuth();
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Non autorisé');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth routes ───────────────────────────────────────────────────────────────
export async function login(username, password) {
  const data = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  saveAuth(data.token, data.user);
  return data;
}

export async function logout() {
  await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  clearAuth();
}

export async function fetchMe() {
  return apiFetch(`${API_BASE}/auth/me`);
}

export async function registerUser(username, password, role = 'user') {
  return apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  });
}

// ── Public character routes ───────────────────────────────────────────────────
export async function fetchHealth() {
  return apiFetch(`${API_BASE}/health`);
}

export async function fetchCharacterNames() {
  return apiFetch(`${API_BASE}/characters/names`);
}

export async function fetchAllCharacters(params = {}) {
  const url = new URL(`${API_BASE}/characters`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return apiFetch(url.toString());
}

export async function fetchRandomCharacter() {
  return apiFetch(`${API_BASE}/characters/random`);
}

export async function fetchCharacter(name) {
  return apiFetch(`${API_BASE}/characters/${encodeURIComponent(name)}`);
}

export async function postGuess(guess, targetName) {
  return apiFetch(`${API_BASE}/guess`, {
    method: 'POST',
    body: JSON.stringify({ guess, targetName })
  });
}

// ── Protected CRUD routes ─────────────────────────────────────────────────────
export async function createCharacter(data) {
  return apiFetch(`${API_BASE}/characters`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCharacter(name, data) {
  return apiFetch(`${API_BASE}/characters/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteCharacter(name) {
  return apiFetch(`${API_BASE}/characters/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}
