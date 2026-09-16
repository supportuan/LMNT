import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { mailConfigured } from "@/lib/mail";

export async function GET() {
  let database = "up";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "down";
  }

  const ok = database === "up";
  return NextResponse.json(
    {
      ok,
      database,
      mail: mailConfigured() ? "configured" : "missing",
    },
    { status: ok ? 200 : 503 },
  );
}
