# EduMetrics — School Exam Portal

A pnpm monorepo for a school exam management platform targeting Kenyan CBC teachers. Includes a React web app, an Express API server, and an Expo mobile app.

## Stack

- **Frontend** (`artifacts/exam-analyser`): React 18 + Vite + Tailwind CSS + Supabase Auth
- **API Server** (`artifacts/api-server`): Express 5 + Drizzle ORM + Supabase + Google Gemini AI
- **Mobile** (`artifacts/mobile-app`): Expo (React Native)
- **Shared libs** (`lib/`): `api-client-react`, `api-spec`, `api-zod`, `db`
- **Package manager**: pnpm workspaces

## How to run

Both services start automatically via the **Project** run button (parallel workflow).

| Service | Port | Workflow name |
|---------|------|---------------|
| Exam Analyser (web) | 5000 | `artifacts/exam-analyser: web` |
| API Server | 8080 | `artifacts/api-server: API Server` |

The web app proxies `/api/*` requests to the API server on port 8080.

## Required secrets

Set these in Replit Secrets:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SESSION_SECRET` | Express session secret |

Optional (Africa's Talking SMS):
- `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`

## Environment variables (userenv.shared)

- `PORT=8080` (API server port, also sets fallback for vite config)
- `BASE_PATH=/`
- `API_SERVER_PORT=8080`
- `EXPO_PUBLIC_API_URL` — API base URL for the mobile app
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## User preferences

- Use Supabase for auth and database
- Use Gemini API for AI features
