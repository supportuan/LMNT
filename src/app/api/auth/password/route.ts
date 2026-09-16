import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { bumpSessionVersion, hashPassword, verifyPassword } from "@/lib/auth";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession();
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return apiError("Invalid request", 400);
  }

  if (body.currentPassword === body.newPassword) {
    return apiError("New password must be different", 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return apiError("Unauthorized", 401);

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) return apiError("Current password is incorrect", 400);

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() })
    .where(eq(users.id, session.userId));
  await bumpSessionVersion(session.userId);
  const [updated] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  await setSessionCookie(
    await createSessionToken({ ...session, sessionVersion: updated?.sessionVersion ?? session.sessionVersion + 1 }),
  );
  await writeAudit(session, "user.password_changed", "user", session.userId);
  return apiOk({});
}
