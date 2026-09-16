import { NextResponse } from "next/server";
import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/policy";
import { getSession, type SessionPayload } from "@/lib/session";

export async function requireApiSession(permission?: Permission) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (permission && !hasPermission(session.activeRole, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json({ ok: true, ...data });
}

export function centreIdForSession(session: SessionPayload) {
  return session.activeCentreId ?? session.centreIds[0] ?? null;
}

export function resolveCentreId(session: SessionPayload, requested?: string) {
  if (requested) {
    if (session.activeRole === "admin") return requested;
    if (session.centreIds.includes(requested)) return requested;
    return null;
  }
  return centreIdForSession(session);
}
