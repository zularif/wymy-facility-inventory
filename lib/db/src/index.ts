import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

// Log connection string format (password masked) and test connection
const maskedUrl = process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":***@") ?? "(not set)";
console.log("[db] Connecting to:", maskedUrl);

pool.connect()
  .then(client => { client.release(); console.log("[db] Connection OK"); })
  .catch(err => console.error("[db] Connection FAILED:", err.message));

pool.on("error", (err) => console.error("[db] Pool error:", err.message));

export const db = drizzle(pool, { schema });

export * from "./schema";
