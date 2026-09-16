# ================================================
# Music Match — Secrets GitHub à configurer
# ================================================
# GitHub → Settings → Secrets and variables → Actions
# ================================================

## Secrets obligatoires

| Secret          | Description                                              | Où trouver                          |
|------------------|-----------------------------------------------------------|--------------------------------------|
| DATABASE_URL    | Connection string Neon, utilisée par le job de migration  | Neon → Project → Connection Details |

## Environnements GitHub

Créer l'environnement `prod` dans GitHub → Settings → Environments (utilisé par le job `migrate-prod` de [ci.yml](.github/workflows/ci.yml)) :
- Protection recommandée : ajouter un "Required reviewer" (toi ou un coéquipier) avant d'appliquer des migrations sur la base de prod.

## Déploiement — pas de secret GitHub

Vercel (web) et Render (api) déploient directement depuis leur propre intégration GitHub, indépendamment de GitHub Actions. Leurs variables d'environnement se configurent dans leurs dashboards respectifs, pas comme secrets GitHub :

| Variable                  | Où                      | Description                                   |
|----------------------------|-------------------------|------------------------------------------------|
| NEXT_PUBLIC_API_URL        | Vercel (apps/web)       | URL de l'API sur Render                        |
| DATABASE_URL               | Render (apps/api)       | Connection string Neon                         |
| JWT_SECRET                 | Render (apps/api)       | Secret fort et aléatoire                       |
| FRONTEND_URL               | Render (apps/api)       | URL Vercel (CORS + socket.io)                  |
| BLOB_READ_WRITE_TOKEN      | Vercel + Render         | Token Vercel Blob (Storage → Blob → créer un store) |
| SPOTIFY_/DEEZER_/SOUNDCLOUD_CLIENT_ID/SECRET | Render | Credentials OAuth des providers musicaux |
| BREVO_API_KEY              | Render (apps/api)       | Clé API Brevo (email de reset de mot de passe) |
| EMAIL_FROM                 | Render (apps/api)       | Adresse expéditrice vérifiée dans Brevo (Senders) |

Voir [.env.prod.example](.env.prod.example) pour le détail complet.

## Services utilisés (100% gratuit)

| Service       | Rôle                        | Coût                                         |
|----------------|------------------------------|-----------------------------------------------|
| Vercel         | Web (Next.js)                | Gratuit                                       |
| Render         | API (Express + socket.io)    | Gratuit (veille après 15 min d'inactivité)   |
| Neon           | PostgreSQL                   | Gratuit, sans expiration                      |
| Vercel Blob    | Stockage (photos de profil)  | Gratuit (1 GB)                                |

**Redis** n'est pas déployé — le code ne l'utilise pas (à ajouter plus tard si besoin,
ex: Upstash a un free tier généreux).
