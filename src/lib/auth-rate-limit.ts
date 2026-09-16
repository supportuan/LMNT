import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authRateLimits } from "@/db/schema";

export async function isRateLimited(key: string, max: number) {
  const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  if (!row) return false;
  if (row.blockedUntil.getTime() <= Date.now()) return false;
  return row.count >= max;
}

export async function recordRateLimitHit(key: string, windowMs: number) {
  const now = Date.now();
  const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  if (!row || row.blockedUntil.getTime() <= now) {
    await db
      .insert(authRateLimits)
      .values({
        key,
        count: 1,
        blockedUntil: new Date(now + windowMs),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: authRateLimits.key,
        set: {
          count: 1,
          blockedUntil: new Date(now + windowMs),
          updatedAt: new Date(),
        },
      });
    return;
  }

  await db
    .update(authRateLimits)
    .set({ count: row.count + 1, updatedAt: new Date() })
    .where(eq(authRateLimits.key, key));
}

export async function clearRateLimit(key: string) {
  await db.delete(authRateLimits).where(eq(authRateLimits.key, key));
}
