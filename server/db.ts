import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const dbUrl = process.env.GLOWSCAN_DB || process.env.SUPABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "SUPABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});
export const db = drizzle(pool, { schema });
