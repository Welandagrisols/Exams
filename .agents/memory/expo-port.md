---
name: Expo port constraints
description: Which ports work for Expo Metro bundler on Replit
---

## Rule

Use **port 8082** for Expo Metro on Replit. Port 8081 is unavailable (blocked by the Replit proxy).

**Why:** The Replit reverse proxy reserves certain ports; 8081 is one of them. Metro silently fails or the preview never connects when bound to 8081.

**How to apply:** In the Expo artifact.toml or workflow config, set `PORT=8082` (or whatever env var Metro reads). If Metro defaults to 8081, override it explicitly.
