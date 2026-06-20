import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to add the database connection string?",
  );
}

const sslConfig = connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
  ? undefined
  : { rejectUnauthorized: false };

export const pool = new Pool({ connectionString, ssl: sslConfig });
export const db = drizzle(pool, { schema });

export * from "./schema";
