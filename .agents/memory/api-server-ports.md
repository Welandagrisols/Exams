---
name: API Server port
description: Port assignment for the API Server artifact in this workspace
---

## Current state

The API Server artifact runs on **port 8080** (set by its artifact.toml / managed workflow).

**Why:** The artifact workflow injects `PORT=8080` via the managed env; the server reads `process.env.PORT` at startup.

**How to apply:** Never hard-code 8000 anywhere. If the server silently starts on the wrong port, check that the managed workflow (not a hand-crafted one) is running — only the managed workflow injects the correct `PORT`.

Note: Earlier project history had a duplicate legacy workflow conflict (port 8000 vs 8080). That conflict does not exist in this workspace — there is only one API Server workflow.
