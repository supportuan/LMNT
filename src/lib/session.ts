import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  getSessionSecret,
  setSessionCookie,
  shouldRefreshSession,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const verified = await verifySessionToken(token);
  if (!verified) return null;

  const [user] = await db
    .select({ sessionVersion: users.sessionVersion, status: users.status })
    .from(users)
    .where(eq(users.id, verified.session.userId))
    .limit(1);

  if (!user || user.status !== "active" || user.sessionVersion !== verified.session.sessionVersion) {
    try {
      await clearSessionCookie();
    } catch {
      // Cookie delete is best-effort from Server Components.
    }
    return null;
  }

  return verified.session;
}
