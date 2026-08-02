import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// IMPORTANT: SUPABASE_DB_URL takes priority over the generic DATABASE_URL.
// Replit's own "Postgres database" integration auto-provisions its own
// separate database and silently injects a DATABASE_URL secret when enabled
// — if that took priority, the whole app would connect to an empty Replit
// database instead of the school's real Supabase database, with no error,
// just missing data (including the users table, so nobody would ever be
// able to reach admin screens no matter what their role actually is).
const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string set. Set SUPABASE_DB_URL (preferred) or DATABASE_URL to your Supabase Postgres connection string.",
  );
}

// Log which variable was used and which host it points to (never the
// credentials) so a wrong-database mixup like the one above is visible in
// the server logs immediately instead of silently degrading every user to
// the most-restrictive role.
try {
  const usedVar = process.env.SUPABASE_DB_URL ? "SUPABASE_DB_URL" : "DATABASE_URL";
  const host = new URL(connectionString).host;
  // eslint-disable-next-line no-console
  console.log(`[db] Connecting via ${usedVar} → ${host}`);
} catch {
  // Malformed URL — let the Pool below surface the real connection error.
}

const sslConfig = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
  ? undefined
  : { rejectUnauthorized: false };

export const pool = new Pool({ connectionString, ssl: sslConfig });
export const db = drizzle(pool, { schema });

export * from "./schema";
