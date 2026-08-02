---
name: Expo port constraints and workflow setup
description: How the Expo mobile artifact workflow runs and what port/CWD quirks to know
---

## CWD quirk — expo artifact workflows run FROM the artifact directory

Unlike web artifact workflows (which run from workspace root), Expo artifact workflows run **from `artifacts/mobile-app/`** as CWD. This means:

- `pnpm --filter @workspace/mobile-app run dev` FAILS from that CWD ("No projects matched the filters")
- The correct artifact.toml run command is just: `pnpm run dev` (no --filter)
- The dev script runs via pnpm in the artifact directory context

**How to apply:** When the expo workflow errors "No projects matched the filters", check the `artifact.toml` `[services.development] run` value. Change from `pnpm --filter @workspace/mobile-app run dev` to `pnpm run dev`.

## Port

The artifact.toml injects `PORT=24382` (dynamically assigned). The dev script uses `--port ${PORT:-8082}` to respect this. Metro will use 24382, not 8081 or 8082. Port 8081 is unavailable on Replit proxy.

## Secret bridging

Supabase secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are Replit secrets not prefixed with `EXPO_PUBLIC_`. Metro only inlines `EXPO_PUBLIC_*` vars. Bridge them in the dev script:

```
EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY EXPO_PUBLIC_API_URL=https://$REPLIT_DEV_DOMAIN node_modules/.bin/expo start --port ${PORT:-8082} --localhost
```

**Why:** `node_modules/.bin/expo` is used directly (not `pnpm exec expo`) because `@expo/cli` may hoist to root node_modules and fail to find `expo/package.json`. The local binary avoids this.
