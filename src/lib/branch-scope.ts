import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { SessionPayload } from "@/lib/session";

/** Centres in the current workspace. `undefined` = org-wide (no branch filter). */
export function scopedCentreIds(session: SessionPayload): string[] | undefined {
  const activeCentreId = session.activeCentreId ?? null;
  if (session.activeRole === "admin") {
    return activeCentreId ? [activeCentreId] : undefined;
  }
  if (session.activeRole === "centre_manager" && session.centreIds.length > 0) {
    return session.centreIds;
  }
  return undefined;
}

export function workspaceCentreLabel(session: SessionPayload): string {
  const activeCentreId = session.activeCentreId ?? null;
  if (session.activeRole === "admin") {
    if (activeCentreId) return session.centreNames[activeCentreId] ?? "Branch";
    return "All branches";
  }
  return session.centreIds.map((id) => session.centreNames[id]).filter(Boolean).join(", ");
}

export function centreInScope(session: SessionPayload, centreId: string | null | undefined): boolean {
  const ids = scopedCentreIds(session);
  if (!ids) return true;
  if (!centreId) return false;
  return ids.includes(centreId);
}

/** Centre filter for the active workspace; undefined = org-wide. */
export function centreScope(session: SessionPayload, centreIdCol: PgColumn): SQL | undefined {
  const ids = scopedCentreIds(session);
  if (!ids?.length) return undefined;
  return ids.length === 1 ? eq(centreIdCol, ids[0]) : inArray(centreIdCol, ids);
}

export function withCentreScope(session: SessionPayload, condition: SQL, centreCol: PgColumn): SQL {
  const scope = centreScope(session, centreCol);
  return scope ? and(condition, scope)! : condition;
}

export function orgAndCentreScope(
  session: SessionPayload,
  orgCol: PgColumn,
  centreCol: PgColumn,
): SQL {
  return withCentreScope(session, eq(orgCol, session.organisationId), centreCol);
}

export function memberInScope(session: SessionPayload, memberCentreId: string): boolean {
  if (session.activeRole === "admin" || session.activeRole === "centre_manager") {
    return centreInScope(session, memberCentreId);
  }
  return true;
}
