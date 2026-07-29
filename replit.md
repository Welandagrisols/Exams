# JSS Exam Analyser (EduMetrics)

School exam management system for Kenyan CBC teachers — record scores, generate student reports, view class rankings, analytics, and trends.

## Run & Operate

- `pnpm --filter @workspace/exam-analyser run dev` — run the web frontend (port 21653, proxy `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxy `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to Supabase (dev only)

## Required Secrets

- `SUPABASE_URL` — Supabase project URL (e.g. `https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY` — Supabase anon/public key (used by frontend + API JWT validation)
- `SUPABASE_DB_URL` — Direct Postgres connection string for Drizzle ORM (e.g. `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + Wouter (PWA-enabled)
- API: Express 5
- Auth: Supabase (JWT validation in API middleware; Supabase client in frontend)
- DB: Supabase PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo app in `artifacts/mobile-app/` (separate package, not a registered Replit artifact)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (used by API routes)
- `lib/db/src/schema/` — Drizzle schema (school, classes, students, exams, scores, reports, messages, users)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — Supabase JWT auth + role fetch
- `artifacts/api-server/src/middlewares/rbac.ts` — RBAC helpers (isStaff, canEditClass)
- `artifacts/exam-analyser/src/pages/` — React pages (dashboard, classes, students, exams, scores, reports, rankings, analytics, trends, messages)
- `artifacts/exam-analyser/src/contexts/AuthContext.tsx` — Supabase auth context

## Architecture decisions

- Supabase used for auth (JWT) and Postgres; Drizzle for schema/migrations
- RBAC: roles (teacher/admin/principal/deputy) stored in `users` table; class ownership via `classes.teacherId`
- OpenAPI-first: spec → codegen → typed hooks for both frontend and server validation
- PWA enabled on the web app (installable, offline-ready for reports)
- Mobile app (`artifacts/mobile-app/`) is a separate Expo app with its own pnpm lockfile, excluded from the workspace

## Product

- **Dashboard** — school-wide stats, class snapshots with sparklines
- **Classes** — manage classes, assign teachers, view per-class exams
- **Students** — per-class student roster, bulk import, fee balances
- **Exams** — create/manage exams, bulk score entry, OCR upload
- **Scores** — scoresheet view, bulk upsert
- **Reports** — individual student report cards with comments + digital signatures
- **Rankings** — class rankings per exam
- **Analytics** — per-subject means, rubric distributions, grade breakdowns
- **Trends** — class and student performance over time
- **Messages** — compose and broadcast results to parents via SMS

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `vite` must stay in root `package.json` devDependencies (tailwind worker thread resolution)
- `zod` must be an explicit dep of `artifacts/api-server` (esbuild resolves from server's own dep tree)
- API server port is 8080; do not swap with the old duplicate workflow port
- To run pnpm install: use `CI=true pnpm install --no-frozen-lockfile` from root
- First user must be promoted to admin manually in Supabase: `UPDATE users SET role='admin' WHERE email='...'`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
