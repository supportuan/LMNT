import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { AccessScope } from "@/db/schema";

export type PermissionMeta = {
  key: Permission;
  label: string;
  description: string;
  group: string;
  defaultScope: AccessScope;
};

/** Central permission catalog — roles only reference these keys. */
export const PERMISSION_CATALOG: PermissionMeta[] = [
  { key: PERMISSIONS.CLIENT_VIEW, label: "View members", description: "See member profiles and rosters", group: "Members", defaultScope: "center" },
  { key: PERMISSIONS.CLIENT_CREATE, label: "Create members", description: "Add new members and packs", group: "Members", defaultScope: "center" },
  { key: PERMISSIONS.CLIENT_EDIT, label: "Edit members", description: "Update member details and notes", group: "Members", defaultScope: "center" },
  { key: PERMISSIONS.ASSESSMENT_VIEW, label: "View assessments", description: "Read capability assessments", group: "Assessments", defaultScope: "assigned" },
  { key: PERMISSIONS.ASSESSMENT_CREATE, label: "Create assessments", description: "Start new assessments", group: "Assessments", defaultScope: "assigned" },
  { key: PERMISSIONS.ASSESSMENT_EDIT, label: "Edit assessments", description: "Update assessment results", group: "Assessments", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRAM_VIEW, label: "View programs", description: "See workout programmes", group: "Programs", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRAM_CREATE, label: "Create programs", description: "Build new programmes", group: "Programs", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRAM_EDIT, label: "Edit programs", description: "Change programme content", group: "Programs", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRAM_PUBLISH, label: "Publish programs", description: "Activate programmes for clients", group: "Programs", defaultScope: "assigned" },
  { key: PERMISSIONS.SESSION_VIEW, label: "View sessions", description: "See session schedules and history", group: "Sessions", defaultScope: "assigned" },
  { key: PERMISSIONS.SESSION_START, label: "Start sessions", description: "Begin a coaching session", group: "Sessions", defaultScope: "assigned" },
  { key: PERMISSIONS.SESSION_LOG, label: "Log sessions", description: "Record session outcomes", group: "Sessions", defaultScope: "assigned" },
  { key: PERMISSIONS.SESSION_EDIT, label: "Edit sessions", description: "Change session details", group: "Sessions", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRESS_VIEW, label: "View progress", description: "See progress metrics", group: "Progress", defaultScope: "assigned" },
  { key: PERMISSIONS.PROGRESS_EDIT, label: "Edit progress", description: "Update measurements and notes", group: "Progress", defaultScope: "assigned" },
  { key: PERMISSIONS.NUTRITION_VIEW, label: "View nutrition", description: "See nutrition plans", group: "Nutrition", defaultScope: "assigned" },
  { key: PERMISSIONS.NUTRITION_EDIT, label: "Edit nutrition", description: "Update nutrition plans", group: "Nutrition", defaultScope: "assigned" },
  { key: PERMISSIONS.MESSAGE_CLIENT, label: "Message clients", description: "Send client messages and AI coach tips", group: "Communication", defaultScope: "assigned" },
  { key: PERMISSIONS.LEAD_VIEW, label: "View leads", description: "See sales pipeline", group: "Sales", defaultScope: "center" },
  { key: PERMISSIONS.LEAD_CREATE, label: "Create leads", description: "Add new leads", group: "Sales", defaultScope: "center" },
  { key: PERMISSIONS.CONSULTATION_VIEW, label: "View consultations", description: "See consult bookings", group: "Sales", defaultScope: "center" },
  { key: PERMISSIONS.CONSULTATION_CREATE, label: "Create consultations", description: "Book consults", group: "Sales", defaultScope: "center" },
  { key: PERMISSIONS.OWN_REVENUE_VIEW, label: "Own revenue", description: "See personal package / share revenue", group: "Revenue", defaultScope: "self" },
  { key: PERMISSIONS.ORG_REVENUE_VIEW, label: "Organisation revenue", description: "See gym-wide payments and packs", group: "Revenue", defaultScope: "organisation" },
  { key: PERMISSIONS.CALENDAR_VIEW, label: "View calendar", description: "See schedules and timetables", group: "Calendar", defaultScope: "assigned" },
  { key: PERMISSIONS.CALENDAR_EDIT, label: "Edit calendar", description: "Book and protect schedule blocks", group: "Calendar", defaultScope: "assigned" },
  { key: PERMISSIONS.TRAINER_MANAGE, label: "Manage trainers", description: "Manage staff / trainer roster", group: "People", defaultScope: "center" },
  { key: PERMISSIONS.USER_MANAGE, label: "Manage users", description: "Invite and disable users", group: "People", defaultScope: "organisation" },
  { key: PERMISSIONS.ROLE_MANAGE, label: "Manage roles", description: "Create roles and assign permissions", group: "People", defaultScope: "organisation" },
  { key: PERMISSIONS.ORG_SETTINGS, label: "Organisation settings", description: "Branches, assets, org profile", group: "Admin", defaultScope: "organisation" },
  { key: PERMISSIONS.ANALYTICS_VIEW, label: "Analytics", description: "Dashboards and reports", group: "Admin", defaultScope: "organisation" },
  { key: PERMISSIONS.AUDIT_VIEW, label: "Audit log", description: "View security and change audit", group: "Admin", defaultScope: "organisation" },
  { key: PERMISSIONS.COACH_DEVELOPMENT, label: "Coach development", description: "Development and coach mirror tools", group: "Coach", defaultScope: "self" },
  { key: PERMISSIONS.WORK_REQUEST_VIEW, label: "View work requests", description: "See facility work requests", group: "Operations", defaultScope: "center" },
  { key: PERMISSIONS.WORK_REQUEST_CREATE, label: "Create work requests", description: "Report facility issues", group: "Operations", defaultScope: "center" },
  { key: PERMISSIONS.WORK_REQUEST_APPROVE, label: "Approve work requests", description: "Approve or reject requests", group: "Operations", defaultScope: "center" },
  { key: PERMISSIONS.ATTENDANCE_VIEW, label: "View attendance", description: "See check-ins", group: "Attendance", defaultScope: "self" },
  { key: PERMISSIONS.ATTENDANCE_WRITE, label: "Mark attendance", description: "Check in", group: "Attendance", defaultScope: "self" },
  { key: PERMISSIONS.COACH_MATCH, label: "Coach match", description: "Browse and request coaches", group: "Member portal", defaultScope: "organisation" },
  { key: PERMISSIONS.PARTNER_VIEW, label: "View partners", description: "See partner offers", group: "Partners", defaultScope: "organisation" },
  { key: PERMISSIONS.PARTNER_MANAGE, label: "Manage partners", description: "Configure partners and agreements", group: "Partners", defaultScope: "organisation" },
  { key: PERMISSIONS.COMMUNITY_VIEW, label: "View community", description: "See community groups", group: "Community", defaultScope: "organisation" },
  { key: PERMISSIONS.COMMUNITY_MANAGE, label: "Manage community", description: "Moderate community content", group: "Community", defaultScope: "organisation" },
  { key: PERMISSIONS.MODERATION_VIEW, label: "View moderation", description: "See reported messages", group: "Moderation", defaultScope: "organisation" },
  { key: PERMISSIONS.MODERATION_MANAGE, label: "Manage moderation", description: "Act on reports", group: "Moderation", defaultScope: "organisation" },
];

export const ACCESS_SCOPES: { value: AccessScope; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "organisation", label: "Organisation" },
  { value: "region", label: "Region" },
  { value: "center", label: "Center" },
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
  { value: "assigned", label: "Assigned only" },
  { value: "self", label: "Self only" },
];

export function permissionGroups() {
  const map = new Map<string, PermissionMeta[]>();
  for (const item of PERMISSION_CATALOG) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}

export function isKnownPermission(value: string): value is Permission {
  return PERMISSION_CATALOG.some((p) => p.key === value);
}
