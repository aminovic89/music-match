#!/bin/bash
# ================================================
# Music Match — Setup Azure infrastructure
# Lance ce script UNE SEULE FOIS pour créer
# tous les services Azure DEV + PROD
# ================================================
# Usage : bash setup-azure.sh
# ================================================

set -e

LOCATION="francecentral"
ACR_NAME="musicmatchacr"

echo "================================================"
echo "  Music Match — Setup Azure"
echo "================================================"

# ─── CONNEXION ───────────────────────────────────
echo "→ Connexion Azure..."
az login

# ─── RESOURCE GROUPS ─────────────────────────────
echo "→ Création des resource groups..."
az group create --name music-match-dev-rg  --location $LOCATION
az group create --name music-match-prod-rg --location $LOCATION

# ─── AZURE CONTAINER REGISTRY (partagé) ──────────
echo "→ Création du Container Registry..."
az acr create \
  --resource-group music-match-dev-rg \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
echo "  ACR Username : $ACR_USERNAME"
echo "  ACR Password : [récupéré — à ajouter dans GitHub Secrets]"

# ─── APP SERVICE PLANS ───────────────────────────
echo "→ Création des App Service plans (Free F1)..."
az appservice plan create \
  --name music-match-dev-plan \
  --resource-group music-match-dev-rg \
  --sku FREE --is-linux

az appservice plan create \
  --name music-match-prod-plan \
  --resource-group music-match-prod-rg \
  --sku FREE --is-linux

# ─── WEB APPS (API) ──────────────────────────────
echo "→ Création des Web Apps..."
az webapp create \
  --resource-group music-match-dev-rg \
  --plan music-match-dev-plan \
  --name music-match-api-dev \
  --deployment-container-image-name $ACR_NAME.azurecr.io/music-match-api:dev-latest

az webapp create \
  --resource-group music-match-prod-rg \
  --plan music-match-prod-plan \
  --name music-match-api-prod \
  --deployment-container-image-name $ACR_NAME.azurecr.io/music-match-api:latest

# Autoriser l'accès ACR depuis les Web Apps
az webapp config container set \
  --name music-match-api-dev \
  --resource-group music-match-dev-rg \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

az webapp config container set \
  --name music-match-api-prod \
  --resource-group music-match-prod-rg \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# ─── POSTGRESQL ──────────────────────────────────
echo "→ Création des bases de données PostgreSQL..."
az postgres flexible-server create \
  --resource-group music-match-dev-rg \
  --name music-match-db-dev \
  --location $LOCATION \
  --admin-user mmadmin \
  --admin-password "DevPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15

az postgres flexible-server create \
  --resource-group music-match-prod-rg \
  --name music-match-db-prod \
  --location $LOCATION \
  --admin-user mmadmin \
  --admin-password "ProdPassword456!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15

# Créer les databases
az postgres flexible-server db create \
  --resource-group music-match-dev-rg \
  --server-name music-match-db-dev \
  --database-name musicmatch

az postgres flexible-server db create \
  --resource-group music-match-prod-rg \
  --server-name music-match-db-prod \
  --database-name musicmatch

# ─── REDIS ───────────────────────────────────────
echo "→ Création des caches Redis..."
az redis create \
  --resource-group music-match-dev-rg \
  --name music-match-redis-dev \
  --location $LOCATION \
  --sku Basic \
  --vm-size C0

az redis create \
  --resource-group music-match-prod-rg \
  --name music-match-redis-prod \
  --location $LOCATION \
  --sku Basic \
  --vm-size C0

# ─── BLOB STORAGE ────────────────────────────────
echo "→ Création du Blob Storage..."
az storage account create \
  --name musicmatchstorage \
  --resource-group music-match-dev-rg \
  --location $LOCATION \
  --sku Standard_LRS

az storage container create \
  --name profile-photos \
  --account-name musicmatchstorage \
  --public-access blob

az storage container create \
  --name backups \
  --account-name musicmatchstorage \
  --public-access off

# ─── STATIC WEB APPS ─────────────────────────────
echo "→ Création des Static Web Apps..."
az staticwebapp create \
  --name music-match-web-dev \
  --resource-group music-match-dev-rg \
  --location "West Europe"

az staticwebapp create \
  --name music-match-web-prod \
  --resource-group music-match-prod-rg \
  --location "West Europe"

# ─── CREDENTIALS GITHUB ACTIONS ──────────────────
echo "→ Création des credentials GitHub Actions..."
DEV_CREDS=$(az ad sp create-for-rbac \
  --name music-match-github-dev \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/music-match-dev-rg \
  --sdk-auth)

PROD_CREDS=$(az ad sp create-for-rbac \
  --name music-match-github-prod \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/music-match-prod-rg \
  --sdk-auth)

# ─── RÉSUMÉ ──────────────────────────────────────
echo ""
echo "================================================"
echo "  Setup terminé ! Secrets à ajouter sur GitHub"
echo "================================================"
echo ""
echo "→ Settings > Secrets and variables > Actions"
echo ""
echo "ACR_USERNAME       : $ACR_USERNAME"
echo "ACR_PASSWORD       : $ACR_PASSWORD"
echo ""
echo "AZURE_CREDENTIALS_DEV :"
echo $DEV_CREDS
echo ""
echo "AZURE_CREDENTIALS_PROD :"
echo $PROD_CREDS
echo ""
echo "AZURE_STATIC_WEB_APPS_TOKEN_DEV :"
az staticwebapp secrets list --name music-match-web-dev --query "properties.apiKey" -o tsv
echo ""
echo "AZURE_STATIC_WEB_APPS_TOKEN_PROD :"
az staticwebapp secrets list --name music-match-web-prod --query "properties.apiKey" -o tsv
echo ""
echo "URLs DEV  : https://music-match-api-dev.azurewebsites.net"
echo "URLs PROD : https://music-match-api-prod.azurewebsites.net"
echo "================================================"
