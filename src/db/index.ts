import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

type SqlClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  postgres: SqlClient | undefined;
};

function sslOption(url: string) {
  if (/sslmode=disable/i.test(url)) return false;
  if (
    url.includes("rds.amazonaws.com") ||
    /sslmode=(require|verify)/i.test(url)
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const client: SqlClient =
  globalForDb.postgres ??
  postgres(connectionString, {
    // Next.js HMR re-evaluates this module; keep a tiny pool in dev so leftover
    // clients cannot exhaust Postgres (error 53300).
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    ssl: sslOption(connectionString),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgres = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
