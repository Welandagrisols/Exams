---
name: Supabase password recovery redirects
description: Password recovery requires configured web and native redirect destinations in the Supabase Auth URL settings.
---

Password recovery is a client-side Supabase Auth flow: the reset request sends the user to the web reset route or the `edumetrics` native scheme, and the app exchanges the recovery link before updating the password.

**Why:** Supabase rejects or misroutes recovery emails when the destination is not listed in the project's allowed redirect URLs, even when the client implementation is correct.

**How to apply:** Keep the web reset route allowed for each deployed web origin and allow the native `edumetrics://auth/reset-password` destination for mobile builds.