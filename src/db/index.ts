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
  postgresUrl: string | undefined;
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

function createClient(url: string) {
  return postgres(url, {
    // Next.js HMR re-evaluates this module; keep a tiny pool in dev so leftover
    // clients cannot exhaust Postgres (error 53300).
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    ssl: sslOption(url),
  });
}

let client: SqlClient;
if (
  process.env.NODE_ENV !== "production" &&
  globalForDb.postgres &&
  globalForDb.postgresUrl === connectionString
) {
  client = globalForDb.postgres;
} else {
  if (globalForDb.postgres && globalForDb.postgresUrl !== connectionString) {
    void globalForDb.postgres.end({ timeout: 2 }).catch(() => undefined);
  }
  client = createClient(connectionString);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.postgres = client;
    globalForDb.postgresUrl = connectionString;
  }
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
