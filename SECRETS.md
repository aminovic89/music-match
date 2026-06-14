# ================================================
# Music Match — Secrets GitHub à configurer
# ================================================
# GitHub → Settings → Secrets and variables → Actions
# ================================================

## Secrets obligatoires

| Secret                            | Description                                      | Où trouver                          |
|-----------------------------------|--------------------------------------------------|-------------------------------------|
| ACR_USERNAME                      | Username Azure Container Registry               | Sortie du script setup-azure.sh     |
| ACR_PASSWORD                      | Password Azure Container Registry               | Sortie du script setup-azure.sh     |
| AZURE_CREDENTIALS_DEV             | JSON credentials Service Principal DEV          | Sortie du script setup-azure.sh     |
| AZURE_CREDENTIALS_PROD            | JSON credentials Service Principal PROD         | Sortie du script setup-azure.sh     |
| AZURE_STATIC_WEB_APPS_TOKEN_DEV   | Token déploiement Static Web Apps DEV           | Sortie du script setup-azure.sh     |
| AZURE_STATIC_WEB_APPS_TOKEN_PROD  | Token déploiement Static Web Apps PROD          | Sortie du script setup-azure.sh     |

## Secrets optionnels

| Secret          | Description                    |
|-----------------|--------------------------------|
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
