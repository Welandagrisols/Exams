import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Prefer values from app.config.js extra (works in both dev and EAS builds),
// fall back to EXPO_PUBLIC_ env vars for standalone .env usage.
const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl: string =
  extra.supabaseUrl ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const supabaseAnonKey: string =
  extra.supabaseAnonKey ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
