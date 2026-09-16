import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AppRole } from "@/lib/policy";

export const SESSION_COOKIE = "lmnt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24;
const SESSION_REFRESH_SECONDS = 60 * 60 * 12;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  organisationId: string;
  organisationName: string;
  activeRole: AppRole;
  centreIds: string[];
  centreNames: Record<string, string>;
  roles: AppRole[];
  /** Admin workspace branch. `null` = all branches. */
  activeCentreId: string | null;
  sessionVersion: number;
};

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  if (
    process.env.NODE_ENV === "production" &&
    (secret.length < 32 || /change-me|change.in.prod|local-dev|dev-session/i.test(secret))
  ) {
    throw new Error("SESSION_SECRET is not production-safe");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const claims: SessionPayload = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    organisationId: payload.organisationId,
    organisationName: payload.organisationName,
    activeRole: payload.activeRole,
    centreIds: payload.centreIds,
    centreNames: payload.centreNames,
    roles: payload.roles,
    activeCentreId: payload.activeCentreId ?? null,
    sessionVersion: payload.sessionVersion ?? 1,
  };
  return new SignJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<{ session: SessionPayload; expiresAt: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const session = payload as unknown as SessionPayload;
    const expiresAt = typeof payload.exp === "number" ? payload.exp : 0;
    return {
      session: {
        ...session,
        activeCentreId: typeof session.activeCentreId === "string" ? session.activeCentreId : null,
        sessionVersion: typeof session.sessionVersion === "number" ? session.sessionVersion : 0,
      },
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function shouldRefreshSession(expiresAt: number) {
  return expiresAt * 1000 - Date.now() < SESSION_REFRESH_SECONDS * 1000;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
