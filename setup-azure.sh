#!/bin/bash
# ================================================
# Music Match — Setup Azure infrastructure (100% free tier)
# Lance ce script UNE SEULE FOIS pour créer
# tous les services Azure DEV + PROD
# ================================================
# Usage : bash setup-azure.sh
#
# Services créés (tous gratuits) :
#   - App Service F1 (API)        → gratuit
#   - PostgreSQL Flexible Server  → gratuit 12 mois
#   - Blob Storage                → gratuit 12 mois (5 GB)
#   - Static Web Apps (Next.js)   → gratuit
#
# Images Docker : GitHub Container Registry (ghcr.io)
#   → gratuit, géré par GitHub Actions (pas créé ici)
#
# Redis : retiré pour l'instant — pas de free tier Azure pour
#   Azure Cache for Redis. À ajouter plus tard si besoin
#   (ex: Upstash a un free tier généreux).
# ================================================

set -e

LOCATION="francecentral"

echo "================================================"
echo "  Music Match — Setup Azure (free tier)"
echo "================================================"

# ─── CONNEXION ───────────────────────────────────
echo "→ Connexion Azure..."
az login

# ─── ENREGISTREMENT DES PROVIDERS ────────────────
# Nécessaire sur une souscription toute neuve, sinon erreur
# "MissingSubscriptionRegistration" / "SubscriptionNotFound"
echo "→ Enregistrement des providers Azure (peut prendre 1-2 min)..."
az provider register --namespace Microsoft.DBforPostgreSQL --wait
az provider register --namespace Microsoft.Storage --wait
az provider register --namespace Microsoft.Web --wait

# ─── RESOURCE GROUPS ─────────────────────────────
echo "→ Création des resource groups..."
az group create --name music-match-dev-rg  --location $LOCATION
az group create --name music-match-prod-rg --location $LOCATION

# ─── APP SERVICE PLANS (Free F1) ─────────────────
echo "→ Création des App Service plans (Free F1)..."
az appservice plan create \
  --name music-match-dev-plan \
  --resource-group music-match-dev-rg \
  --sku FREE --is-linux

az appservice plan create \
  --name music-match-prod-plan \
  --resource-group music-match-prod-rg \
  --sku FREE --is-linux

# ─── WEB APPS (API) — images depuis GitHub Container Registry ──
echo "→ Création des Web Apps..."
echo "  NOTE : les images ghcr.io doivent être PUBLIQUES pour que"
echo "  App Service puisse les tirer sans credentials."
echo "  → Après le premier push, va sur GitHub > Packages >"
echo "    music-match-api > Package settings > Change visibility > Public"

az webapp create \
  --resource-group music-match-dev-rg \
  --plan music-match-dev-plan \
  --name music-match-api-dev \
  --deployment-container-image-name ghcr.io/aminovic89/music-match-api:dev-latest

az webapp create \
  --resource-group music-match-prod-rg \
  --plan music-match-prod-plan \
  --name music-match-api-prod \
  --deployment-container-image-name ghcr.io/aminovic89/music-match-api:latest

# ─── POSTGRESQL (free tier 12 mois) ──────────────
echo "→ Création des bases de données PostgreSQL..."
az postgres flexible-server create \
  --resource-group music-match-dev-rg \
  --name music-match-db-dev \
  --location $LOCATION \
  --admin-user mmadmin \
  --admin-password "DevPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --public-access 0.0.0.0-255.255.255.255

az postgres flexible-server create \
  --resource-group music-match-prod-rg \
  --name music-match-db-prod \
  --location $LOCATION \
  --admin-user mmadmin \
  --admin-password "ProdPassword456!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --public-access 0.0.0.0-255.255.255.255

# Créer les databases (--name, pas --database-name, depuis Azure CLI 2.6x+)
az postgres flexible-server db create \
  --resource-group music-match-dev-rg \
  --server-name music-match-db-dev \
  --name musicmatch

az postgres flexible-server db create \
  --resource-group music-match-prod-rg \
  --server-name music-match-db-prod \
  --name musicmatch

# ─── BLOB STORAGE (free tier 12 mois — 5GB) ──────
echo "→ Création du Blob Storage..."
# ⚠️ STORAGE_NAME doit être unique MONDIALEMENT (3-24 caractères, minuscules/chiffres).
# "musicmatchstorage" est probablement déjà pris — change-le si besoin
# (ex: musicmatchdev, musicmatch<tonpseudo>).
STORAGE_NAME="musicmatchdev"

az storage account create \
  --name $STORAGE_NAME \
  --resource-group music-match-dev-rg \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access true

# Récupérer la clé pour créer le container (--auth-mode login échoue souvent
# sur un compte tout neuf sans rôle RBAC Storage assigné)
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_NAME \
  --resource-group music-match-dev-rg \
  --query "[0].value" -o tsv)

az storage container create \
  --name profile-photos \
  --account-name $STORAGE_NAME \
  --account-key "$STORAGE_KEY" \
  --public-access blob

# ─── STATIC WEB APPS (free) ──────────────────────
echo "→ Création des Static Web Apps..."
az staticwebapp create \
  --name music-match-web-dev \
  --resource-group music-match-dev-rg \
  --location "West Europe"

az staticwebapp create \
  --name music-match-web-prod \
  --resource-group music-match-prod-rg \
  --location "West Europe"

# ─── CREDENTIALS GITHUB ACTIONS (pour déployer sur App Service) ──
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
echo "================================================"
echo "  ⚠️  ÉTAPE MANUELLE OBLIGATOIRE"
echo "================================================"
echo "Après le premier 'git push' sur develop ou main :"
echo "1. Va sur https://github.com/aminovic89/music-match/pkgs/container/music-match-api"
echo "2. Package settings > Change visibility > Public"
echo "(sinon Azure App Service ne pourra pas tirer l'image)"
echo "================================================"
echo ""
echo "URLs DEV  : https://music-match-api-dev.azurewebsites.net"
echo "URLs PROD : https://music-match-api-prod.azurewebsites.net"
echo "================================================"
