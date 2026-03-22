import { fetchCharacterNames, fetchRandomCharacter, postGuess, getUser } from './api.js';
import { guardAuth, renderUserBar } from './auth.js';

// ── Auth guard — redirect to login.html if no token ───────────────────────────
guardAuth();
renderUserBar();
// Show admin + test nav links if admin
import('./api.js').then(({ getUser }) => {
  const user = getUser();
  const adminLink = document.getElementById('nav-admin');
  const testLink  = document.getElementById('nav-test');
  if (user?.role === 'admin') {
    if (adminLink) adminLink.style.display = '';
    if (testLink)  testLink.style.display  = '';
  }
});

// ── Stats ────────────────────────────────────────────────────────────────────
function statsKey() {
  const u = getUser();
  return u ? `op_stats_${u.username}` : null;
}
export function getStats() {
  const k = statsKey();
  if (!k) return null;
  return JSON.parse(localStorage.getItem(k) || '{"found":0,"totalAttempts":0,"bestScore":null}');
}
function recordWin(n) {
  const k = statsKey();
  if (!k) return;
  const s = getStats();
  s.found++;
  s.totalAttempts += n;
  s.bestScore = s.bestScore === null ? n : Math.min(s.bestScore, n);
  localStorage.setItem(k, JSON.stringify(s));
}

// ── State ────────────────────────────────────────────────────────────────────
let allNames = [];
let targetCharacter = null;
let attempts = 0;
let gameOver = false;

const COLUMNS = [
  { key: 'personnage',      label: 'Personnage'  },
  { key: 'genre',           label: 'Genre'       },
  { key: 'affiliation',     label: 'Affiliation' },
  { key: 'fruitDuDemon',    label: 'Fruit démon' },
  { key: 'haki',            label: 'Haki'        },
  { key: 'dernierePrime',   label: 'Prime'       },
  { key: 'hauteur',         label: 'Hauteur'     },
  { key: 'origine',         label: 'Origine'     },
  { key: 'premierArc',      label: 'Premier arc' },
];

// ── DOM refs ─────────────────────────────────────────────────────────────────
const searchInput    = document.getElementById('search-input');
const suggestions    = document.getElementById('suggestions');
const guessBtn       = document.getElementById('guess-btn');
const messageBox     = document.getElementById('message');
const attemptsEl     = document.getElementById('attempts-counter');
const resultsSection = document.getElementById('results-section');
const winBanner      = document.getElementById('win-banner');
const winAttempts    = document.getElementById('win-attempts');
const winName        = document.getElementById('win-name');
const newGameBtn     = document.getElementById('new-game-btn');
const giveupBtn      = document.getElementById('giveup-btn');
const abandonBanner  = document.getElementById('abandon-banner');
const abandonName    = document.getElementById('abandon-name');
const newGameBtnAbandon = document.getElementById('new-game-btn-abandon');

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  showMessage('Connexion à l\'API…', 'info');
  try {
    allNames = await fetchCharacterNames();
    await startNewGame();
    hideMessage();
  } catch (err) {
    showMessage(`❌ Impossible de contacter l'API (port 3001). Vérifiez que le backend est démarré.\n${err.message}`, 'error');
  }
}

async function startNewGame() {
  targetCharacter = await fetchRandomCharacter();
  attempts = 0;
  gameOver = false;
  updateAttemptsCounter();
  clearResults();
  winBanner.style.display = 'none';
  abandonBanner.style.display = 'none';
  searchInput.value = '';
  searchInput.disabled = false;
  guessBtn.disabled = false;
  giveupBtn.disabled = false;
}

// ── Search / Autocomplete ─────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { closeSuggestions(); return; }

  const matches = allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { closeSuggestions(); return; }

  suggestions.innerHTML = matches
    .map(n => `<div class="suggestion-item" data-name="${n}">${highlight(n, q)}</div>`)
    .join('');
  suggestions.classList.add('open');
});

suggestions.addEventListener('click', (e) => {
  const item = e.target.closest('.suggestion-item');
  if (!item) return;
  searchInput.value = item.dataset.name;
  closeSuggestions();
  searchInput.focus();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#search-wrapper')) closeSuggestions();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleGuess();
});

guessBtn.addEventListener('click', handleGuess);
newGameBtn.addEventListener('click', async () => {
  await startNewGame();
  showMessage('Nouveau personnage choisi — bonne chance !', 'info');
  setTimeout(hideMessage, 2500);
});

newGameBtnAbandon.addEventListener('click', async () => {
  await startNewGame();
  showMessage('Nouveau personnage choisi — bonne chance !', 'info');
  setTimeout(hideMessage, 2500);
});

giveupBtn.addEventListener('click', () => {
  if (gameOver) return;
  gameOver = true;
  searchInput.disabled = true;
  guessBtn.disabled = true;
  giveupBtn.disabled = true;
  abandonName.textContent = targetCharacter.personnage;
  abandonBanner.style.display = 'block';
  // Pas d'appel à recordWin() → stats non affectées
});

// ── Guess Logic ───────────────────────────────────────────────────────────────
async function handleGuess() {
  if (gameOver) return;
  const name = searchInput.value.trim();
  if (!name) return;

  guessBtn.disabled = true;
  try {
    const data = await postGuess(name, targetCharacter.personnage);
    attempts++;
    updateAttemptsCounter();
    addRow(data.comparison, data.correct);

    if (data.correct) {
      gameOver = true;
      recordWin(attempts);
      searchInput.disabled = true;
      winName.textContent = targetCharacter.personnage;
      winAttempts.textContent = attempts;
      winBanner.style.display = 'block';
      hideMessage();
    } else {
      guessBtn.disabled = false;
      searchInput.value = '';
      searchInput.focus();
    }
  } catch (err) {
    showMessage(`❌ ${err.message}`, 'error');
    guessBtn.disabled = false;
  }
}

// ── Table rendering ───────────────────────────────────────────────────────────
function buildTableIfNeeded() {
  if (document.getElementById('results-table')) return;
  const table = document.createElement('table');
  table.id = 'results-table';
  const thead = table.createTHead();
  const tr = thead.insertRow();
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    tr.appendChild(th);
  });
  table.createTBody();
  resultsSection.appendChild(table);
}

function addRow(comparison, correct) {
  buildTableIfNeeded();
  const tbody = document.querySelector('#results-table tbody');
  const tr = document.createElement('tr');
  tr.className = 'result-row';

  COLUMNS.forEach(col => {
    const td = document.createElement('td');
    const field = comparison[col.key];
    if (!field) { td.textContent = '—'; tr.appendChild(td); return; }

    const isCorrect = field.correct;
    const isPartial = !isCorrect && field.partial;
    td.classList.add(isCorrect ? 'cell-correct' : isPartial ? 'cell-partial' : 'cell-wrong');
    if (col.key === 'personnage') td.classList.add('cell-name');

    let html = escapeHtml(String(field.value));
    if (field.direction && field.direction !== 'equal') {
      html += `<span class="arrow ${field.direction === 'up' ? 'arrow-up' : 'arrow-down'}">${field.direction === 'up' ? '↑' : '↓'}</span>`;
    }
    td.innerHTML = html;
    tr.appendChild(td);
  });

  tbody.insertBefore(tr, tbody.firstChild);
}

function clearResults() {
  const table = document.getElementById('results-table');
  if (table) table.remove();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function updateAttemptsCounter() {
  if (attemptsEl) attemptsEl.innerHTML = `Tentatives : <span>${attempts}</span>`;
}

function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = type;
}
function hideMessage() { messageBox.className = ''; messageBox.textContent = ''; }
function closeSuggestions() { suggestions.classList.remove('open'); suggestions.innerHTML = ''; }

function highlight(name, q) {
  const idx = name.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx)) +
    `<strong style="color:var(--accent)">${escapeHtml(name.slice(idx, idx + q.length))}</strong>` +
    escapeHtml(name.slice(idx + q.length));
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
