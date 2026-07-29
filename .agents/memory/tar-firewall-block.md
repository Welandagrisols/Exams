---
name: tar package firewall block
description: Replit's package firewall blocks the npm `tar` package at all versions, preventing eas-cli install and originally blocking expo too.
---

# tar npm package blocked by Replit firewall

## The rule
Replit's package firewall blocks `tar` (node-tar) at ALL versions tested: 6.x, 7.5.7, 7.5.16. HTTP 403 from `package-firewall.replit.local`.

**Why:** Likely a security policy update — tar has had historical CVEs. The block is version-agnostic.

## Impact
- `eas-cli` depends on `tar` → removed from `artifacts/mobile-app/package.json` devDependencies. APK cloud builds currently unavailable from Replit.
- `expo@53` also depends on `tar` via `@expo/cli` → blocked on fresh install. Workaround: use `--prefer-offline` since expo is cached in the pnpm store (`~/.local/share/pnpm/store/v10`).

## How to apply
- For workspace install: always use `CI=true pnpm install --prefer-offline --no-frozen-lockfile` so expo resolves from cache.
- For eas-cli: do NOT add it back to package.json — the install will fail. Use the EAS build workaround documented in `eas-build-replit.md` with a separately obtained eas-cli binary if needed.
- If tar ever gets unblocked, restore `"eas-cli": "^20.3.0"` to `artifacts/mobile-app/package.json` devDependencies.
