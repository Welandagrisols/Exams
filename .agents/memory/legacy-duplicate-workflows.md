---
name: Legacy duplicate workflows conflict
description: Stray artifacts/* workflows conflict on ports with main workflows, causing EADDRINUSE failures
---

This repo has stray duplicate workflows (`artifacts/api-server: API Server`, `artifacts/exam-analyser: web`, `artifacts/mockup-sandbox: Component Preview Server`) alongside the real ones defined in `.replit` (`API Server`, `Exam Analyser`, `Mobile App`). These duplicates are not part of the main `Project` run button workflow.

**Why:** After a git sync or dependency reinstall, restarting workflows can leave orphaned Node/Vite/Expo processes bound to ports (8000, 5000, 8080, 8081, 8082, 21653). The duplicate workflows then race with the main ones for the same ports, causing `EADDRINUSE` failures that look like the app is broken even though the real fix is unrelated to code.

**How to apply:** When workflows fail with `EADDRINUSE` or "port already in use," first check `ps aux` for stray `node`/`vite`/`expo` processes and `kill -9` them, then restart only the three primary workflows (`API Server`, `Exam Analyser`, `Mobile App`). Leave the `artifacts/*` duplicates stopped — they are redundant and reintroducing them just recreates the port conflict.
