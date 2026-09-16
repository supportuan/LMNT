import postgres from "postgres";

const host = process.env.RDS_HOST?.trim();
const password = process.env.POSTGRES_PASSWORD;
const user = process.env.POSTGRES_USER?.trim() || "postgres";
const database = process.env.POSTGRES_DB?.trim() || "postgres";

if (!host || !password) {
  console.error("ERROR: RDS_HOST and POSTGRES_PASSWORD must be set in .env");
  process.exit(1);
}

console.log(`Checking postgres://${user}@${host}:5432/${database} ...`);

const sql = postgres({
  host,
  port: 5432,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
  max: 1,
});

try {
  const rows = await sql`select 1 as ok`;
  console.log("RDS connection OK:", rows[0]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("RDS connection FAILED:", message);
  console.error(
    "Fix: RDS security group must allow port 5432 from this EC2 instance's security group.",
  );
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
