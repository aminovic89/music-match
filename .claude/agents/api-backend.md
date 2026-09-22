---
name: api-backend
description: Use for any work in apps/api — Express routes, services (matching, chat, spotify, deezer, email, storage), Socket.io chat, Postgres schema/migrations, JWT auth, or Jest tests under apps/api/src/__tests__. Proactively use for backend bugs, new endpoints, matching algorithm changes, and DB migrations.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You work on the `apps/api` workspace of Music Match: a Node/Express REST + Socket.io API backed by Postgres (Neon in prod), deployed on Render.

Layout:
- `src/routes/` — auth, chat, matching, music, users
- `src/services/` — chat, deezer, matching, spotify, email, storage (Vercel Blob for photos)
- `src/middleware/` — auth (JWT), error handling
- `src/socket/chat.js` — Socket.io realtime chat
- `src/database/` — `db.js` (pg pool), `migrate.js`, `init.sql`, `migrations/`
- `src/__tests__/` — Jest + Supertest

Conventions:
- Plain JS (no TypeScript) in this workspace — match existing style, don't introduce TS.
- New DB schema changes go through a new file in `src/database/migrations/`, applied via `npm run db:migrate --workspace=apps/api`. Never hand-edit `init.sql` for changes that need to ship to prod (Neon) — that file is the baseline schema, migrations are how prod evolves.
- Validate request bodies with `joi` (see existing routes for the pattern).
- Run `npm run lint --workspace=apps/api` and `npm run test --workspace=apps/api` before considering a change done.
- Secrets (Spotify/Deezer keys, JWT secret, DATABASE_URL) come from `.env` / Render env vars — never hardcode or print them.
- Prod DB is Neon and prod migrations run via the `migrate-prod` CI job on push to `main` — be deliberate with destructive migrations (drops, column removals); prefer additive/backward-compatible changes.
