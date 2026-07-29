---
name: Digital Signature Feature
description: Architecture and key decisions for the per-user digital signature system added to the web app.
---

## What was built
- Users draw or upload a signature in Settings → "My Signature" section
- Signatures are stored as base64 PNG data-URLs in `users.signature_data` (Supabase DB)
- When editing a student report, teachers/principals can tick "Apply my signature as [role]" before saving
- Applied signatures are stored per-report in `report_comments.teacher_signature_data` / `report_comments.principal_signature_data`
- On print, stored signatures render as `<img>` tags, replacing the "Signature & Stamp: ...." placeholder

## DB columns added
- `users.signature_data TEXT` — base64 PNG data-URL
- `report_comments.teacher_signature_data TEXT`
- `report_comments.principal_signature_data TEXT`
- Pushed to Supabase via `drizzle-kit push` from `lib/db/`

## API routes
- `GET /api/me` — returns user profile + signatureData (upserts user row on first call)
- `PATCH /api/me/signature` — saves signatureData to users table
- `DELETE /api/me/signature` — clears signatureData
- Route file: `artifacts/api-server/src/routes/profile.ts`, registered in `routes/index.ts`

## Signature drawing
- `SignaturePad.tsx` in `exam-analyser/src/components/`
- Pure HTML5 canvas, no external library
- Draws in blue (#1a56db) to look handwritten
- Two tabs: "Draw" (mouse/touch) and "Upload" (converts image to data-URL on a canvas)
- Canvas internal size: 700×~182px, displayed responsively

## Key decisions
- Report page uses direct `authFetch` PATCH (not the generated client mutation) to send signatures — avoids needing to regenerate the full api-client-react build
- Signatures auto-apply on save only when the checkbox is explicitly ticked — prevents accidental double-signing
- `(report as any).teacherSignatureData` cast needed because GetReportResponse zod type was updated in api-zod but the generated api-client-react types are not rebuilt at dev time

**Why:** The api-client-react lib is compiled from source and its dist/ is not always rebuilt during development, so new fields on zod schemas don't automatically propagate to TS types in the web app. Using `(x as any)` or direct authFetch is the pragmatic approach until a full rebuild.
