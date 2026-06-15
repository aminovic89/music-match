# ============ BUILDER ============
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les manifestes (root + workspaces utilisés par l'API) pour npm ci
# Contexte de build = racine du monorepo (npm workspaces)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/

RUN npm ci --omit=dev

# Copier le code source nécessaire
COPY apps/api ./apps/api
COPY packages ./packages

# ============ RUNTIME ============
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["node", "apps/api/src/index.js"]
