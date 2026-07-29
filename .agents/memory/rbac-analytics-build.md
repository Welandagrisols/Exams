---
name: RBAC and Analytics Build
description: Full RBAC + mobile analytics implementation — decisions, patterns, and what was built
---

## What was built (RBAC + Analytics)

### DB schema
- `users.role` column: `teacher|admin|principal|deputy`, default `teacher`
- `classes.teacherId`: FK to `users.id`, nullable — identifies the assigned class teacher
- Schema pushed via `drizzle-kit push` — confirmed applied

### API middleware
- `auth.ts` — after Supabase JWT validation, fetches `role` from `usersTable` and `assignedClassIds` from `classesTable` in parallel. Attaches to `res.locals.role` and `res.locals.assignedClassIds`. Falls back to `"teacher"` if DB unreachable.
- `rbac.ts` — exports `isStaff(locals)`, `canEditClass(classId, locals)`, `forbidden(res, msg)`, `AppLocals` type.

### Route protection
| Route | Guard |
|-------|-------|
| `POST /scores` + `/scores/bulk` | canEditClass (via exam lookup) |
| `POST /students` | canEditClass (classId in body) |
| `PATCH/DELETE /students/:id` | canEditClass (lookup student → classId first) |
| `POST /students/fee-balances/bulk` | canEditClass (classId in body) or isStaff |
| `POST /messages` | canEditClass (classId in body) |
| `POST /messages/broadcast-results/:examId` | canEditClass (via exam lookup) |
| `POST /messages/:id/send-sms` | canEditClass (via message lookup) |
| `POST/PATCH/DELETE /exams` | canEditClass (classId in body or via lookup) |
| `POST /exams/bulk` | canEditClass (all classIds) |
| `POST /exams/:examId/ocr-upload` | canEditClass (via exam lookup) |
| `POST/PATCH/DELETE /classes` | isStaff only |
| `PATCH /classes/:id/teacher` | isStaff only (new endpoint) |
| `GET/PATCH /users` | isStaff only (new endpoints) |

**Why:** API must enforce RBAC regardless of what the UI hides.

### Profile endpoint
- `GET /api/me` returns: `id, email, firstName, lastName, role, assignedClassIds, assignedClasses`
- Used by both web and mobile to get role after login

### Mobile analytics screens
- `app/exams/[examId]/analytics.tsx` — per-subject stats + grade distribution bars
- `app/classes/[classId]/trends.tsx` — class average across exams, toggle overall/by-subject
- `app/students/[studentId]/trends.tsx` — individual student trajectory with class comparison

### Mobile navigation wiring
- `classes.tsx` tabs: added Trends (trending-up) icon button per class row
- `classes/[classId]/exams.tsx`: added Analytics button (always visible), Scores/Scan behind `canWrite`
- `reports/[examId]/[studentId].tsx`: added "View Student Trends" button
- `exams/[examId]/rankings.tsx`: "Send Results to Parents" button behind `canWrite`
- `classes/[classId]/students.tsx`: Scan Registration / Scan Class List buttons behind `canWrite`
- `messages/compose.tsx`: Send button behind `canWrite(classId)`

### Mobile context + hook
- `AuthContext.tsx`: after login, fetches `/api/me` to get `profile` (role + assignedClassIds). Exposes `profile`, `refreshProfile`.
- `hooks/usePermissions.ts`: `usePermissions(classId?)` → `{ isStaff, canWrite, canMessage, canView, role, assignedClassIds }`

### Web AuthContext
- Updated to fetch profile from `/api/me` and expose `profile`, `role`
- Added `useIsStaff()` helper hook

## How to assign a teacher to a class (admin)
```
PATCH /api/classes/:id/teacher
Body: { userId: "<supabase-user-id>" }
```
First user must be promoted to admin manually:
```sql
UPDATE users SET role='admin' WHERE email='...';
```
