# EduMetrics

School exam management system with web portal and companion mobile app. Teachers can manage classes, enter exam scores, generate report cards, and send SMS messages to parents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8000)
- `pnpm --filter @workspace/exam-analyser run dev` — run the web app (port 5000)
- `pnpm --filter @workspace/mobile-app run start` — run the Expo mobile app (port 8082, QR code for Expo Go)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `EXPO_PUBLIC_API_URL` — Replit dev domain (no trailing slash) for mobile → API calls
- Required env: `GEMINI_API_KEY` — Gemini AI integration

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8000)
- DB: PostgreSQL + Drizzle ORM
- Web: React 19 + Vite + Tailwind CSS 4
- Mobile: Expo SDK 53 + Expo Router + React Native 0.79
- AI: Gemini (via @google/generative-ai)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/` — Express API server
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/exam-analyser/src/` — React web app
- `artifacts/mobile-app/app/` — Expo Router screens
- `artifacts/mobile-app/constants/colors.ts` — design tokens (shared palette)
- `artifacts/mobile-app/lib/api.ts` — API fetch helpers for mobile
- `packages/db/` — Drizzle ORM schema (source of truth)
- `packages/api-spec/` — OpenAPI spec (source of truth for API contract)

## Architecture decisions

- Mobile app calls the same REST API as the web app — no separate mobile backend.
- `EXPO_PUBLIC_API_URL` must be set to the full Replit dev domain (e.g. `https://xxx.worf.replit.dev`) so the mobile device can reach the API from Expo Go.
- Mobile app uses Expo SDK 53 (not the latest SDK 56) to stay compatible with Expo Go's bundled runtime.
- API server uses port 8000 (not 5000) because the web app occupies port 5000.
- The `artifacts/api-server: API Server` duplicate workflow runs on port 8080 — do not let it clash with the main API Server workflow on 8000.

## Product

- **Web portal** — full exam management: classes, students, exams, score entry, report cards, rankings, AI analysis, SMS messaging.
- **Mobile app** — companion view-only + messaging app: dashboard with class snapshots, class lists, exam lists, score viewer, rankings, report card sharing, SMS compose & send.

## User preferences

- Android APK: user will build independently via EAS outside Replit. Expo Launch (iOS only) is available on Replit.

## Gotchas

- **expo-keep-awake stale watch path**: After upgrading packages, a `_tmp_NNNN/build` directory watch path can become stale and crash Metro. Fix: `mkdir -p <full stale path>` then restart the Mobile App workflow.
- **Port 8081 unavailable**: Replit Repl proxy doesn't support port 8081. Use port 8082 for Expo (`expo start --port 8082`).
- **`artifacts/api-server: API Server` workflow**: This duplicate always-on workflow uses port 8080 by default (not 8000). The primary `API Server` workflow uses port 8000. If both start simultaneously, restart the primary one after the duplicate claims 8080.
- Always run `pnpm install` from workspace root, not just from `artifacts/mobile-app/`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
