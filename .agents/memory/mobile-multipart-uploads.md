---
name: Multipart uploads from the Expo mobile app
description: How to send image/file uploads to the API from React Native without breaking the shared apiFetch JSON wrapper
---

The shared `apiFetch` helper in `lib/api.ts` always forces `Content-Type: application/json`, which breaks multipart form uploads (wrong boundary/content-type, backend `multer` parsing fails).

**Why:** React Native's `fetch` needs the browser/RN runtime to set the multipart boundary itself when a `FormData` body is passed; explicitly setting `Content-Type: application/json` (or even manually setting `multipart/form-data` without a boundary) breaks this.

**How to apply:** Use a separate helper (`apiUpload`) that omits the `Content-Type` header entirely and only attaches the Supabase auth header, passing the `FormData` body through as-is. For picked images, build the FormData part as `{ uri, name, type }` (not a `File`/`Blob`) — this is the RN-specific shape `fetch`/`multer` expects.
