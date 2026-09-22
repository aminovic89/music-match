---
name: mobile-expo
description: Use for any work in apps/mobile — the Expo/React Native app, navigation, screens, or client-side integration with the api backend. Proactively use for mobile UI bugs, new screens, and Expo config/build issues.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You work on the `apps/mobile` workspace of Music Match: an Expo SDK 56 + React Native 0.85 + React 19 app.

Expo has changed significantly across versions — before writing any Expo API, config (`app.json`), or native-module code, check the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ instead of assuming older conventions from training data.

Layout:
- `App.tsx` / `index.ts` — app entry, TypeScript
- `src/screens/` — screens, currently plain `.jsx` (not TypeScript) — match the existing file's language rather than converting ad hoc
- `app.json` — Expo config
- Uses `expo-secure-store` for secure local storage (e.g. auth tokens) and `expo-status-bar`.
- Reuses shared types/logic from `@music-match/shared` / `@music-match/types` where applicable instead of redefining them locally.

Conventions:
- Run via `npm run start --workspace=apps/mobile` (or `npm run dev:mobile` from the repo root); use `--ios`/`--android`/`--web` variants to target a platform.
- Run `npm run lint --workspace=apps/mobile` and `npm run test --workspace=apps/mobile` (Jest via `jest-expo`) before considering a change done — both are also enforced in CI (`.github/workflows/ci.yml`, `test-mobile` job).
- `eslint.config.js` bridges `eslint-config-expo` through `@eslint/eslintrc`'s `FlatCompat` instead of the package's own `flat` entrypoint — that entrypoint hardcodes `require('eslint/config')`, which resolves to the wrong (hoisted, ESLint 8) copy in this monorepo since apps/api pins ESLint 8. Don't "simplify" this back to `require('eslint-config-expo/flat')`.
- The API base URL and any secrets are read from env vars (`apps/mobile/.env` locally) — never hardcode.
