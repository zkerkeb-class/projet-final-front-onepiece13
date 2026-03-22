# OnePieceGuess

Jeu de devinettes de personnages One Piece, inspiré de Wordle.

---

## Présentation vidéo

https://youtu.be/k5tTtrLKen0 (Partie 1)
https://youtu.be/F-SW7ntgOQ8 (Partie 2)

---

## Lancement rapide

Installer les dépendances et lancer les deux serveurs :
```bash
cd projet-final-back-onepiece13 && npm install && npm start
cd ../projet-final-front-onepiece13 && npm install && npm start
```

| Service  | URL                             |
|----------|---------------------------------|
| Frontend | http://localhost:3000           |
| Backend  | http://localhost:3001           |
| Test API | http://localhost:3000/test.html |
| Admin    | http://localhost:3000/admin.html|

**Identifiants par défaut(admin):** `admin` / `onepiece`
**Identifiants par défaut(user):** `luffy` / `mugiwara`

---

## Architecture

```
projet_one_piece/
├── projet-final-back-onepiece13/
│   ├── server.js                      # API Express
│   ├── users.json                     # Comptes
│   └── onepieceguess_database.json
└── projet-final-front-onepiece13/
    ├── login.html                     # Page de connexion
    ├── index.html                     # Jeu (protégé)
    ├── admin.html                     # CRUD personnages (admin)
    ├── test.html                      # Tests API (protégé)
    ├── css/style.css
    └── js/
        ├── api.js                     # Toutes les fonctions d'appel API
        ├── auth.js                    # Guards de routes protégées
        └── game.js                    # Logique du jeu
```

---

## Pages de l'application

### login.html
Page publique de connexion. Redirige vers le jeu si l'utilisateur est déjà connecté.

### index.html
Page principale du jeu. Accessible uniquement aux utilisateurs connectés.

### admin.html
Panel d'administration pour la gestion des personnages (CRUD). Accès réservé aux administrateurs.

### test.html
Outil de débogage et de vérification de l'API. Accessible uniquement aux administrateurs.

Permet de :
- Vérifier la santé de l'API (`/api/health`)
- Tester les endpoints GET (noms, personnage aléatoire, défi du jour, recherche)
- Tester les endpoints POST (envoyer une devinette)
- Tester manuellement des devinettes avec autocomplétion
- Afficher les statistiques de la base de données

---

## Fonctionnalités du jeu

### Gameplay
- **Direction de l'arc** : colonne indiquant si l'arc cible se situe avant ou après dans la chronologie (28 arcs ordonnables)
- **Haki partiel** : affichage en orange si le personnage deviné partage certains types de Haki (mais pas tous) avec la cible
- **Fruit du Démon fusionné** : affiche le type (Paramecia / Logia / Zoan) ou "Non"
- **Donner sa langue au chat** : bouton pour abandonner et révéler le personnage (ne compte pas dans les statistiques)

### Statistiques joueur
Chaque joueur peut consulter ses statistiques personnelles (stockage en `localStorage`) :
- Personnages trouvés (nombre total de victoires)
- Tentatives totales (cumul de toutes les tentatives)
- Meilleur score (nombre minimal de tentatives)
- Moyenne tentatives par victoire

Les statistiques sont persistantes entre les sessions.

---

## Système d'authentification : JWT

### JWT sans session serveur

Le système utilise **JWT (JSON Web Token)** sans gestion de sessions côté Express :

| Critère | JWT stateless | Session serveur |
|---------|--------------|-----------------|
| Scalabilité | Aucun état à partager entre instances | Nécessite un store partagé (Redis, etc.) |
| Implémentation | Simple (`jsonwebtoken`) | Plus complexe |
| Adapté au frontend SPA | Token dans `localStorage` | Nécessite cookies + CSRF |
| Révocation immédiate | Avec blacklist en mémoire | Natif |

### Gestion de la révocation

Une `Set` en mémoire enregistre les tokens révoqués :
- Les tokens sont ajoutés lors du `POST /api/auth/logout`
- Vérification par le middleware `requireAuth` à chaque requête protégée

Limite : la blacklist est perdue au redémarrage. En production, utiliser Redis avec un TTL égal à l'expiration du token (2 heures).

### Durée de vie et déconnexion

- Les tokens expirent après **2 heures** (`JWT_EXPIRES=2h`)
- L'API retourne un code 401 si le token est expiré, invalide ou révoqué
- La fonction `apiFetch` dans `js/api.js` intercepte les réponses 401, efface le `localStorage` et redirige vers `login.html`

---

## Routes API

### Authentification (publiques)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion : retourne `{ token, user }` |

### Authentification (protégées — Bearer token requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/logout` | Révoque le token courant |
| GET  | `/api/auth/me` | Profil de l'utilisateur connecté |
| POST | `/api/auth/register` | Crée un compte (admin uniquement) |
| GET  | `/api/auth/users` | Liste des comptes (admin uniquement) |

### Personnages (publiques)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Statut de l'API |
| GET | `/api/characters` | Liste (filtres : `search`, `affiliation`, `genre`) |
| GET | `/api/characters/names` | Noms seuls (autocomplétion) |
| GET | `/api/characters/random` | Personnage aléatoire |
| GET | `/api/characters/daily` | Index du personnage du jour |
| GET | `/api/characters/:name` | Détail d'un personnage |
| POST | `/api/guess` | `{ guess, targetName }` — comparaison |

### Personnages — Modification (protégées, admin uniquement)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/characters` | Créer un personnage |
| PUT  | `/api/characters/:name` | Modifier un personnage |
| DELETE | `/api/characters/:name` | Supprimer un personnage |

---

## Sécurité

### Accès aux pages
| Page | Protection |
|------|-------------|
| `index.html` | Nécessite authentification (redirige vers login si aucun token) |
| `admin.html` | Nécessite authentification + droits admin |
| `test.html` | Nécessite authentification + droits admin |
| `login.html` | Redirige vers le jeu si déjà connecté |

### Contrôle d'accès
- **Déconnexion automatique sur 401** : la fonction `apiFetch` intercepte les réponses 401, efface le stockage local et redirige vers `login.html`
- **Navigation conditionnelle** : les liens "Admin" et "Test API" ne s'affichent que pour les administrateurs
- **Endpoints protégés** : certains endpoints nécessitent un Bearer token valide et les droits admin
