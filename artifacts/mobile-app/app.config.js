const baseConfig = require("./app.json");

/** @type {import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...baseConfig.expo,
  extra: {
    ...baseConfig.expo.extra,
    // Map Replit secrets (no EXPO_PUBLIC_ prefix) to Expo extra so they work
    // both in development (Replit) and production (EAS Build)
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      "",
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      "",
    // API base URL: prefer explicit override, then derive from REPLIT_DEV_DOMAIN
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      (process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:8000"),
  },
});
