---
name: Exam Analyser monorepo setup
description: Key env/dependency lessons for the JSS Exam Analyser pnpm monorepo
---

## Dependency resolution rules

**vite must stay in root `package.json` devDependencies.**
Why: `@tailwindcss/node` gets hoisted to root node_modules, and when it spawns a worker thread it resolves vite from root. If vite is only in `artifacts/exam-analyser/node_modules/vite`, tailwind workers crash with "Cannot find module vite/dist/node/chunks/dist.js".

**`zod` must be an explicit dep of `artifacts/api-server`.**
Why: `exams.ts` imports from zod directly (not via `@workspace/api-zod`). esbuild bundles from the api-server's own dep tree; if zod isn't declared, esbuild can't resolve it.

## Mobile app workflow

Use `node_modules/.bin/expo start` not `pnpm start`.
Why: `@expo/cli` gets hoisted to root node_modules (no `expo` at root). When `pnpm start` runs the script, it resolves `@expo/cli` from root which then can't find `expo/package.json`. The local binary at `artifacts/mobile-app/node_modules/.bin/expo` avoids this.

## Env var bridging for Expo

Created `artifacts/mobile-app/app.config.js` to map Replit secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) to `Constants.expoConfig.extra`. Note: the `.replit` file already has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set as env vars, so either path works.

## DB schema

Run `pnpm --filter @workspace/db run push` to apply schema changes to Supabase Postgres.

## Bugs fixed

- reports.ts: O(N²) rank → O(N) via pre-computed rank map at `/all` endpoint; `buildReport` accepts optional `precomputedRank` param
- scores.ts: dead `areas` query removed (used `ids[0]` but result was never read)
- mobile api.ts: 204 No Content now returns undefined instead of crashing on `.json()`
- mobile api.ts: fixed headers spread order (`...restOptions` before explicit headers so auth always wins)
- db/users.ts: added `.defaultNow()` to `created_at` / `updated_at`
