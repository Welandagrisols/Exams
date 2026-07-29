---
name: Expo keep-awake stale watcher
description: Fix for missing _tmp_N/build path after Expo package upgrades
---

## Symptom

After upgrading Expo packages, the Metro watcher crashes with an error about a missing `_tmp_N/build` path.

## Fix

```bash
mkdir -p /tmp/haste-map-*
# or more precisely, find the expected path from the error and mkdir it
```

**Why:** The keep-awake watcher registers a file path during a previous run; after packages are upgraded the path is stale and the directory no longer exists. Creating the stub directory satisfies the watcher.

**How to apply:** Run this after any `pnpm install` that upgrades Expo packages, if Metro fails to start with a path-not-found error related to `_tmp_N/build`.
