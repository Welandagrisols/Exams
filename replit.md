# JSS Exam Analyser — EduMetrics

A school exam management system for Kenyan CBC (Competency-Based Curriculum) teachers. Built as a pnpm monorepo.

## Architecture

| Component | Path | Port | Tech |
|-----------|------|------|------|
| **Web App** | `artifacts/exam-analyser/` | 5000 | React 19 + Vite + TailwindCSS v4 |
| **API Server** | `artifacts/api-server/` | 8000 | Node.js + Express 5 + Drizzle ORM |
| **Mobile App** | `artifacts/mobile-app/` | 8082 | Expo 53 + React Native 0.79 |

Shared libraries in `lib/`:
- `lib/db` — Drizzle ORM schema + Supabase Postgres client (`@workspace/db`)
- `lib/api-zod` — Zod request/response schemas (`@workspace/api-zod`)
- `lib/api-client-react` — Generated React Query hooks (`@workspace/api-client-react`)
- `lib/api-spec` — OpenAPI spec + Orval config

## Running the Project

All services start automatically via the **Project** workflow. To start individually:

```bash
# API Server (port 8000)
PORT=8000 NODE_ENV=development pnpm --filter @workspace/api-server run build && \
PORT=8000 NODE_ENV=development pnpm --filter @workspace/api-server run start

# Web App (port 5000)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/exam-analyser run dev

# Mobile App (port 8082 — scan QR with Expo Go)
cd artifacts/mobile-app && node_modules/.bin/expo start --port 8082
```

## External Services

| Service | Purpose | Env Vars |
|---------|---------|----------|
| **Supabase** | Database (Postgres via Drizzle) + Auth | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL` |
| **Google Gemini** | OCR for score sheets & student forms | `GEMINI_API_KEY` |
| **Africa's Talking** | SMS to parents | `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` (optional) |

Mobile app reads Supabase credentials via `app.config.js` extra (maps `SUPABASE_URL` → `Constants.expoConfig.extra.supabaseUrl`).

## Key Features

- Class & student management with Excel bulk import
- Exam creation (single or bulk across classes)
- Score entry with CBC rubric grading (EE/ME/AE/BE)
- OCR score sheet scanning via Gemini AI
- Analytics, rankings, trends per class/student
- Report card generation & printing
- Parent messaging via SMS (Africa's Talking) or in-app
- PWA support for offline use

## Development Notes

- The API uses Supabase JWT auth (`requireAuth` middleware calls Supabase `/auth/v1/user`)
- Numeric marks are stored as `numeric(5,2)` in Postgres; Drizzle returns them as strings — always `parseFloat()` before arithmetic
- The `vite` package must stay in root `package.json` devDependencies so `@tailwindcss/node` (hoisted to root) can resolve it
- Mobile app workflow uses `node_modules/.bin/expo start` directly (not `pnpm start`) to avoid root `@expo/cli` resolution conflict

## User Preferences

- Fix bugs and get everything production-ready
