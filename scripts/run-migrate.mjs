import { spawnSync } from "node:child_process";
import "./load-env.mjs";

console.log(`Running drizzle-kit migrate (RDS_HOST=${process.env.RDS_HOST ?? "missing"}) ...`);

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Failed to run drizzle-kit:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
