import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { bumpSessionVersion, hashPassword } from "@/lib/auth";
import { isRateLimited, recordRateLimitHit, clearRateLimit } from "@/lib/auth-rate-limit";
import { apiError, apiOk } from "@/lib/api-helpers";
import { verifyPasswordResetToken } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const key = `reset:${body.token.slice(0, 24)}`;
    if (await isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    const payload = await verifyPasswordResetToken(body.token);
    if (!payload) {
      await recordRateLimitHit(key, WINDOW_MS);
      return apiError("This reset link is invalid or has expired", 400);
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || user.status !== "active" || user.passwordHash.slice(-12) !== payload.stamp) {
      await recordRateLimitHit(key, WINDOW_MS);
      return apiError("This reset link is invalid or has expired", 400);
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(body.password), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await bumpSessionVersion(user.id);
    await clearRateLimit(key);
    return apiOk({});
  } catch {
    return apiError("Invalid request", 400);
  }
}
