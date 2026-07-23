# ================================================
# Music Match — Secrets GitHub à configurer
# ================================================
# GitHub → Settings → Secrets and variables → Actions
# ================================================

## Secrets obligatoires

| Secret                            | Description                                      | Où trouver                          |
|------------------------------------|--------------------------------------------------|--------------------------------------|
| AZURE_CREDENTIALS_DEV             | JSON credentials Service Principal DEV          | Sortie du script setup-azure.sh     |
| AZURE_CREDENTIALS_PROD            | JSON credentials Service Principal PROD         | Sortie du script setup-azure.sh     |
| AZURE_STATIC_WEB_APPS_TOKEN_DEV   | Token déploiement Static Web Apps DEV           | Sortie du script setup-azure.sh     |
| AZURE_STATIC_WEB_APPS_TOKEN_PROD  | Token déploiement Static Web Apps PROD          | Sortie du script setup-azure.sh     |

## Pas de secret nécessaire pour les images Docker

Les images sont poussées vers **GitHub Container Registry (ghcr.io)** —
gratuit et déjà intégré à GitHub Actions via le token automatique
`secrets.GITHUB_TOKEN` (aucune configuration manuelle).

⚠️ **Étape manuelle obligatoire après le premier push** :
Le package Docker doit être rendu **public** pour qu'Azure App Service
puisse le télécharger sans credentials :

1. Va sur `https://github.com/aminovic89/music-match/pkgs/container/music-match-api`
2. Package settings → Change visibility → **Public**

## Secrets optionnels

| Secret          | Description                    |
|------------------|---------------------------------|
| SLACK_WEBHOOK   | URL webhook Slack (optionnel)  |

## Environnements GitHub

Créer deux environnements dans GitHub → Settings → Environments :

1. **dev**
   - Pas de protection requise
   - Déploiement automatique sur push develop

2. **prod**
   - Protection recommandée : ajouter un "Required reviewer" (toi ou un coéquipier)
   - Déploiement automatique sur push main

## Format AZURE_CREDENTIALS

Le script setup-azure.sh génère automatiquement ce JSON :

```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

Coller ce JSON entier dans le secret AZURE_CREDENTIALS_DEV ou AZURE_CREDENTIALS_PROD.

## Services Azure utilisés (100% gratuit)

| Service                          | Tier      | Coût                          |
|------------------------------------|-----------|--------------------------------|
| Azure App Service (API)          | F1 Free   | Gratuit (60 min CPU/jour)     |
| Azure Database for PostgreSQL    | Burstable | Gratuit 12 mois               |
| Azure Blob Storage               | LRS       | Gratuit 12 mois (5 GB)        |
| Azure Static Web Apps (Web)      | Free      | Gratuit                        |
| GitHub Container Registry        | —         | Gratuit                        |

**Redis** n'est pas déployé sur Azure pour l'instant (pas de free tier).
Le code ne l'utilise pas encore — à ajouter plus tard si besoin
(ex: Upstash a un free tier généreux).
