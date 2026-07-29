---
name: pnpm store location mismatch in this workspace
description: What to do when pnpm add/install fails with ERR_PNPM_UNEXPECTED_STORE or a stale local pnpm binary
---

This workspace has had multiple pnpm binaries in play (a project-local `node_modules/.bin/pnpm@9.15.0` pinned via `packageManager`, vs. a global pnpm on PATH). Running `pnpm add` from a package subdirectory can trip `ERR_PNPM_UNEXPECTED_STORE` (store dir v3 vs v10 mismatch) or leave `node_modules` empty mid-operation if interrupted.

**Why:** Switching store dirs or pnpm major versions on a monorepo with hoisted deps is destructive — pnpm will "recreate" node_modules from scratch, and if that step is interrupted (e.g. by a tool timeout or an interactive confirmation prompt), the workspace is left with an empty/broken node_modules.

**How to apply:** Prefer editing `package.json` directly for a single new dependency, then run `CI=true pnpm install --no-frozen-lockfile` from the repo root (not `pnpm add`, and not scoped `--filter` on a subset) to resolve/link everything in one pass. Always run this install synchronously to completion (foreground, not backgrounded/piped through `tail`) — a killed/backgrounded install can leave `node_modules` half-deleted.
