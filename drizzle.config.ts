import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.join(rootDir, ".env") });
config({ path: path.join(rootDir, ".env.local"), override: true });

function isRdsHost(host: string) {
  return host.includes("rds.amazonaws.com");
}

function rdsSsl(host: string) {
  if (!isRdsHost(host)) return false;
  return { rejectUnauthorized: false } as const;
}

function migrateCredentials() {
  const host = process.env.RDS_HOST?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const database = process.env.POSTGRES_DB?.trim() || "postgres";

  // drizzle-kit ignores ssl when dbCredentials.url is set — use host fields for RDS
  if (host && password) {
    return {
      host,
      port: 5432,
      user,
      password,
      database,
      ssl: rdsSsl(host),
    };
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Set RDS_HOST + POSTGRES_PASSWORD or DATABASE_URL for migrations");
  }

  try {
    const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
    if (isRdsHost(parsed.hostname)) {
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 5432),
        user: decodeURIComponent(parsed.username || "postgres"),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, "") || "postgres",
        ssl: rdsSsl(parsed.hostname),
      };
    }
  } catch {
    // fall through to url-only for local dev
  }

  return { url };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  verbose: true,
  dbCredentials: migrateCredentials(),
});
