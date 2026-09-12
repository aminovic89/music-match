# Music Match — Guide de démarrage

## Prérequis
- macOS avec Docker Desktop installé
- Node.js 20+ (`brew install node`)
- VS Code (`brew install --cask visual-studio-code`)
- Expo CLI (`npm install -g expo-cli`)

---

## 1. Installation

```bash
# Cloner le repo
git clone https://github.com/ton-org/music-match.git
cd music-match

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env
# → Remplir les valeurs dans .env (Spotify keys, etc.)
```

---

## 2. Lancer l'environnement local

```bash
# Démarrer PostgreSQL + Redis + Adminer
npm run docker:up

# Vérifier que tout tourne
docker ps

# Initialiser la base de données (première fois)
npm run db:migrate --workspace=apps/api

# Lancer l'API en mode dev (hot reload)
npm run dev:api

# Dans un autre terminal — lancer le web
npm run dev:web

# Dans un autre terminal — lancer le mobile
npm run dev:mobile
```

### Services locaux
| Service     | URL                          | Credentials         |
|-------------|------------------------------|---------------------|
| API         | http://localhost:3000        | —                   |
| Web         | http://localhost:3001        | —                   |
| Adminer     | http://localhost:8080        | postgres / postgres |
| PostgreSQL  | localhost:5432               | postgres / postgres |
| Redis       | localhost:6379               | —                   |

---

## 3. Ouvrir dans VS Code

```bash
# Ouvrir le workspace multi-dossiers
code music-match.code-workspace

# Installer les extensions recommandées
# VS Code affichera une notification → cliquer "Install All"
```

---

## 4. Structure du projet

```
music-match/
├── apps/
│   ├── api/          → Backend Node.js + Express
│   │   ├── src/
│   │   │   ├── routes/       (auth, users, music, matching, chat)
│   │   │   ├── modules/      (auth/, users/, music/, matching/, chat/)
│   │   │   ├── database/     (init.sql, migrate.js)
│   │   │   ├── socket/       (chat.js)
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── Dockerfile.dev
│   ├── mobile/       → React Native + Expo
│   └── web/          → Next.js
├── packages/
│   ├── shared/       → Code partagé (utils, constantes)
│   └── types/        → Types TypeScript partagés
├── .github/
│   └── workflows/
│       └── ci.yml → Lint, tests et migrations Neon (Vercel/Render déploient en direct via GitHub)
├── docker-compose.yml
├── .env.example
└── music-match.code-workspace
```

---

## 5. Déploiement (100% gratuit)

### Services utilisés
| Service         | Rôle                          | Limite gratuite                                |
|------------------|-------------------------------|-------------------------------------------------|
| Vercel           | Web (Next.js)                 | Généreux free tier, déploiement auto sur push   |
| Render           | API (Express + socket.io)     | Free web service, veille après 15 min d'inactivité (~50s de cold start au réveil) |
| Neon             | PostgreSQL                    | Serverless, gratuit, pas d'expiration            |
| Vercel Blob      | Stockage (photos de profil)   | 1 GB gratuit                                     |

Vercel et Render sont connectés directement au repo GitHub et déploient automatiquement sur chaque push vers `main` (pas d'étape manuelle ni de workflow GitHub Actions dédié au déploiement). Le workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) se charge du lint, des tests, et de l'application des migrations sur Neon.

### Setup (une fois)

1. **Vercel** : importer le repo → Root Directory = `apps/web` → variable d'env `NEXT_PUBLIC_API_URL` = URL Render de l'API. Créer un Blob Store dans l'onglet Storage pour obtenir `BLOB_READ_WRITE_TOKEN`.
2. **Render** : New Web Service → connecter le repo → Runtime Docker, Dockerfile Path = `apps/api/Dockerfile` → Health Check Path = `/health` → configurer les variables d'env (voir [.env.prod.example](.env.prod.example)).
3. **Neon** : créer un projet Postgres → récupérer la connection string pour `DATABASE_URL` (Render) et le secret GitHub `DATABASE_URL` (migrations CI).

---

## 6. Commandes utiles

```bash
# Tests
npm test                          # Tous les tests
npm run test --workspace=apps/api # Tests API uniquement

# Docker
npm run docker:up                 # Démarrer les services
npm run docker:down               # Arrêter les services
npm run docker:logs               # Logs de l'API

# Lint
npm run lint                      # Lint tout le monorepo

# Base de données
npm run db:migrate --workspace=apps/api   # Appliquer les migrations
npm run db:seed --workspace=apps/api      # Insérer des données de test
```

## Statut DEV
Pipeline CI/CD opérationnel — lun. 22 juin 2026 22:48:12 CEST
