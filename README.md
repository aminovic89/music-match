# Music Match — Guide de démarrage

## Prérequis
- macOS avec Docker Desktop installé
- Node.js 20+ (`brew install node`)
- VS Code (`brew install --cask visual-studio-code`)
- Azure CLI (`brew install azure-cli`)
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
│       └── ci-cd.yml → Pipeline GitHub Actions → Azure
├── docker-compose.yml
├── .env.example
└── music-match.code-workspace
```

---

## 5. Déploiement Azure (free tiers)

### Services utilisés
| Service                    | Plan      | Limite gratuite              |
|----------------------------|-----------|------------------------------|
| Azure App Service          | F1 Free   | 60 min CPU/jour, 1 GB RAM    |
| Azure Database PostgreSQL  | Flexible  | Gratuit 12 mois              |
| Azure Cache for Redis      | C0 Basic  | 250 MB                       |
| Azure Static Web Apps      | Free      | 100 GB bandwidth/mois        |
| Azure Blob Storage         | LRS       | 5 GB gratuit 12 mois         |

### Première fois (setup Azure)

```bash
# Connexion Azure
az login

# Créer le resource group
az group create --name music-match-rg --location francecentral

# Créer App Service plan (free)
az appservice plan create \
  --name music-match-plan \
  --resource-group music-match-rg \
  --sku FREE --is-linux

# Créer la Web App Node.js
az webapp create \
  --resource-group music-match-rg \
  --plan music-match-plan \
  --name music-match-api \
  --runtime "NODE:20-lts"

# Créer PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group music-match-rg \
  --name music-match-db \
  --location francecentral \
  --admin-user mmadmin \
  --admin-password "ChangeMe123!" \
  --sku-name Standard_B1ms \
  --tier Burstable

# Créer Static Web App (pour Next.js)
az staticwebapp create \
  --name music-match-web \
  --resource-group music-match-rg \
  --location "West Europe" \
  --source https://github.com/ton-org/music-match \
  --branch main \
  --app-location apps/web \
  --output-location .next \
  --login-with-github
```

### Configurer les secrets GitHub

Dans GitHub → Settings → Secrets, ajouter :
- `AZURE_WEBAPP_PUBLISH_PROFILE` → télécharger depuis Azure Portal
- `AZURE_STATIC_WEB_APPS_TOKEN` → depuis la Static Web App
- `API_URL` → URL de l'App Service

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
