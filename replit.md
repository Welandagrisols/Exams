# EduMetrics — School Exam Management Portal

A pnpm monorepo for a Kenyan CBC school exam management system. Consists of three main pieces:

## Project structure

| Artifact | Path | Description |
|---|---|---|
| **JSS Exam Analyser** (web) | `artifacts/exam-analyser/` | React + Vite + Tailwind web app for teachers |
| **API Server** | `artifacts/api-server/` | Node/Fastify API backend |
| **Mobile App** | `artifacts/mobile-app/` | Expo (React Native) mobile companion |
| **Canvas / Mockup Sandbox** | `artifacts/mockup-sandbox/` | Vite-based component preview sandbox |

Shared libraries live under `lib/`. The workspace uses a pnpm catalog (`pnpm-workspace.yaml`) to pin shared dependency versions.

## How to run

All workflows start automatically via the **Project** run button. They can also be started individually:

| Workflow | Command | Port |
|---|---|---|
| API Server | `PORT=8080 NODE_ENV=development pnpm --filter @workspace/api-server run dev` | 8080 |
| JSS Exam Analyser (web) | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/exam-analyser run dev` | 5000 (proxied by artifact system to 21653) |
| Mobile App | `cd artifacts/mobile-app && node_modules/.bin/expo start --port 8082` | 8082 |
| Mockup Sandbox | `PORT=3000 pnpm --filter @workspace/mockup-sandbox run dev` | 3000 |

The web app proxies `/api/*` requests to the API server on port 8080.

## Required secrets / environment variables

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | Web app, API server, mobile | Supabase project URL |
| `SUPABASE_ANON_KEY` | Web app, API server, mobile | Supabase anonymous key |
| `GEMINI_API_KEY` | API server | Google Gemini for AI features |
| `EXPO_TOKEN` | Mobile app | EAS Build token |
| `SESSION_SECRET` | API server | Express/Fastify session signing |

## Installing dependencies

From the workspace root:

```bash
CI=true pnpm install --no-frozen-lockfile
```

## User preferences

- Use pnpm (never npm/yarn) — enforced by `preinstall` script.
