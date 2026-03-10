# OnePieceGuess 🏴‍☠️

Jeu de devinettes de personnages One Piece, inspiré de Wordle.

---

## Lancement rapide

Depuis la racine du projet, double-cliquer sur `start.bat`.  
Le script installe les dépendances si nécessaire, lance les deux serveurs et ouvre le navigateur.

| Service  | URL                             |
|----------|---------------------------------|
| Frontend | http://localhost:3000           |
| Backend  | http://localhost:3001           |
| Test API | http://localhost:3000/test.html |
| Admin    | http://localhost:3000/admin.html|

**Compte par défaut :** `admin` / `onepiece`

---

## Architecture

```
projet_one_piece/
├── start.bat                          ← Script de lancement tout-en-un
├── projet-final-back-onepiece13/
│   ├── server.js                      ← API Express
│   ├── users.json                     ← Comptes (auto-créé au 1er démarrage)
│   └── onepieceguess_database.json
└── projet-final-front-onepiece13/
    ├── login.html                     ← Page de connexion
    ├── index.html                     ← Jeu (protégé)
    ├── admin.html                     ← CRUD personnages (admin)
    ├── test.html                      ← Tests API (protégé)
    ├── css/style.css
    └── js/
        ├── api.js                     ← Toutes les fonctions d'appel API
        ├── auth.js                    ← Guards de routes protégées
        └── game.js                    ← Logique du jeu
```

---

## Choix du système d'authentification : JWT

### JWT seul (sans session serveur)

Nous avons choisi **JWT (JSON Web Token)** sans session serveur côté Express,
pour les raisons suivantes :

| Critère | JWT stateless | Session serveur |
|---------|--------------|-----------------|
| Scalabilité | ✅ Aucun état à partager entre instances | ❌ Nécessite un store partagé (Redis…) |
| Implémentation | ✅ Simple (`jsonwebtoken`) | Plus complexe |
| Adapté au front SPA | ✅ Token dans `localStorage` | Nécessite cookies + CSRF |
| Révocation immédiate | ⚠️ Requiert une blacklist | ✅ Natif |

### Gestion de la révocation (token blacklist)

Pour gérer le **logout** et le **bonus 401** sans sessions, nous maintenons une
`Set` en mémoire des tokens révoqués côté serveur.  
Le token y est ajouté lors du `POST /api/auth/logout` et est vérifié par le
middleware `requireAuth` à chaque requête protégée.

> **Limite** : la blacklist est perdue au redémarrage. En production, on
> utiliserait Redis avec un TTL égal à l'expiration du token (2 h).

### Expiration

Les tokens expirent après **2 heures** (`JWT_EXPIRES=2h`).  
L'API renvoie une 401 si le token est expiré, invalide, ou dans la blacklist.

### Bonus : déconnexion automatique sur 401

Dans `js/api.js`, la fonction `apiFetch` intercepte toute réponse `401` :
elle vide le `localStorage`, et redirige immédiatement vers `login.html`.

---

## Routes API

### Auth (publiques)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion → `{ token, user }` |

### Auth (protégées — Bearer token requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/logout` | Révoque le token courant |
| GET  | `/api/auth/me` | Profil de l'utilisateur connecté |
| POST | `/api/auth/register` | Crée un compte *(admin only)* |
| GET  | `/api/auth/users` | Liste des comptes *(admin only)* |

### Personnages (publiques)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Statut de l'API |
| GET | `/api/characters` | Liste (filtres : `search`, `affiliation`, `genre`) |
| GET | `/api/characters/names` | Noms seuls (autocomplétion) |
| GET | `/api/characters/random` | Personnage aléatoire |
| GET | `/api/characters/daily` | Index du personnage du jour |
| GET | `/api/characters/:name` | Détail d'un personnage |
| POST | `/api/guess` | `{ guess, targetName }` → comparaison |

### Personnages CRUD (protégées)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/characters` | Créer un personnage |
| PUT  | `/api/characters/:name` | Modifier un personnage |
| DELETE | `/api/characters/:name` | Supprimer un personnage |

---

## Routes frontend protégées

| Page | Protection |
|------|-----------|
| `index.html` | `guardAuth()` → redirige vers `login.html` si pas de token |
| `test.html`  | `guardAuth()` → idem |
| `admin.html` | `guardAdmin()` → redirige si pas admin |
| `login.html` | Redirige vers `index.html` si déjà connecté |
