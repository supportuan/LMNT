import { ROLE_PERMISSIONS, type AppRole, type Permission } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/session-token";

/** Prefer session-resolved permissions; fall back to legacy role map during transition. */
export function sessionHasPermission(session: SessionPayload, permission: Permission): boolean {
  if (session.permissions && session.permissions.length > 0) {
    return session.permissions.includes(permission);
  }
  return ROLE_PERMISSIONS[session.activeRole]?.includes(permission) ?? false;
}

export function sessionCanAccessModule(session: SessionPayload, module: string, modulePermission: Permission | undefined) {
  if (!modulePermission) return false;
  return sessionHasPermission(session, modulePermission);
}

/** @deprecated Prefer sessionHasPermission — kept for call sites still passing role only. */
export function legacyRoleHasPermission(role: AppRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
