import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coachingRelationships, leads, members, sessions } from "@/db/schema";
import { memberInScope, centreInScope } from "@/lib/branch-scope";
import { PERMISSIONS, ROLE_PERMISSIONS, type AppRole } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/session";

export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

function hasPermission(role: AppRole, permission: string) {
  return ROLE_PERMISSIONS[role].includes(permission as (typeof ROLE_PERMISSIONS)[AppRole][number]);
}

export function requirePermission(session: SessionPayload, permission: string) {
  if (!hasPermission(session.activeRole, permission as never)) {
    throw new AccessDeniedError();
  }
}

/** Trainer may only access members they coach. Admin/org-wide. Client only self. */
export async function canAccessMember(session: SessionPayload, memberId: string): Promise<boolean> {
  const [member] = await db
    .select({
      id: members.id,
      userId: members.userId,
      organisationId: members.organisationId,
      centreId: members.centreId,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member || member.organisationId !== session.organisationId) return false;

  if (session.activeRole === "admin") {
    return hasPermission(session.activeRole, PERMISSIONS.CLIENT_VIEW) && memberInScope(session, member.centreId);
  }

  if (session.activeRole === "centre_manager") {
    return (
      hasPermission(session.activeRole, PERMISSIONS.CLIENT_VIEW) &&
      memberInScope(session, member.centreId)
    );
  }

  if (session.activeRole === "client") {
    return member.userId === session.userId;
  }

  if (session.activeRole === "trainer") {
    const [rel] = await db
      .select({ id: coachingRelationships.id })
      .from(coachingRelationships)
      .where(
        and(
          eq(coachingRelationships.memberId, memberId),
          eq(coachingRelationships.trainerId, session.userId),
          eq(coachingRelationships.active, true),
        ),
      )
      .limit(1);
    return !!rel;
  }

  return false;
}

export async function assertMemberAccess(session: SessionPayload, memberId: string) {
  if (!(await canAccessMember(session, memberId))) {
    throw new AccessDeniedError("You cannot access this client.");
  }
}

export async function canAccessSession(session: SessionPayload, sessionId: string): Promise<boolean> {
  const [row] = await db
    .select({
      memberId: sessions.memberId,
      trainerId: sessions.trainerId,
      organisationId: sessions.organisationId,
      centreId: sessions.centreId,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row || row.organisationId !== session.organisationId) return false;

  if (session.activeRole === "admin" || session.activeRole === "centre_manager") {
    return hasPermission(session.activeRole, PERMISSIONS.SESSION_VIEW) && centreInScope(session, row.centreId);
  }

  if (session.activeRole === "trainer") {
    return row.trainerId === session.userId;
  }

  if (session.activeRole === "client") {
    return canAccessMember(session, row.memberId);
  }

  return false;
}

export async function assertSessionAccess(session: SessionPayload, sessionId: string) {
  if (!(await canAccessSession(session, sessionId))) {
    throw new AccessDeniedError("You cannot access this session.");
  }
}

export async function canAccessLead(session: SessionPayload, leadId: string): Promise<boolean> {
  const [lead] = await db
    .select({ ownerId: leads.ownerId, organisationId: leads.organisationId, centreId: leads.centreId })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead || lead.organisationId !== session.organisationId) return false;

  if (session.activeRole === "admin" || session.activeRole === "centre_manager") {
    return hasPermission(session.activeRole, PERMISSIONS.LEAD_VIEW) && centreInScope(session, lead.centreId);
  }

  if (session.activeRole === "trainer") {
    return lead.ownerId === session.userId || lead.ownerId == null;
  }

  return false;
}

export function isTrainerRole(role: AppRole) {
  return role === "trainer";
}
