import {
  MODULE_PERMISSION,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

export type { AppRole, Permission };
export { PERMISSIONS };

export type NavItem = {
  href: string;
  label: string;
  module: string;
  children?: NavItem[];
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

/** Coach Life navigation — Today → Week → Clients → Money → Me */
const TRAINER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/app/dashboard", label: "Today", module: "dashboard" },
      { href: "/app/calendar", label: "Week", module: "calendar" },
      { href: "/app/clients", label: "Clients", module: "clients" },
      { href: "/app/money", label: "Money", module: "money" },
      { href: "/app/me", label: "Me", module: "me" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/app/tasks", label: "Tasks", module: "tasks" },
      { href: "/app/sessions", label: "Sessions", module: "sessions" },
      { href: "/app/progress", label: "Progress", module: "progress" },
      { href: "/app/programs", label: "Workouts", module: "programs" },
      { href: "/app/leads", label: "Leads", module: "leads" },
      { href: "/app/work-requests", label: "Report issue", module: "work-requests" },
      { href: "/app/development", label: "Development", module: "development" },
      { href: "/app/community", label: "Community", module: "community" },
      { href: "/app/ai-coach", label: "AI Coach", module: "ai-coach" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    items: [{ href: "/app/analytics", label: "Dashboard", module: "analytics" }],
  },
  {
    items: [
      { href: "/app/members", label: "Members", module: "members" },
      { href: "/app/sessions", label: "Sessions", module: "sessions" },
      { href: "/app/staff", label: "Trainers", module: "staff" },
    ],
  },
  {
    items: [
      { href: "/app/memberships", label: "Membership plans", module: "memberships" },
      { href: "/app/payments", label: "Payments", module: "payments" },
    ],
  },
  {
    items: [
      {
        href: "/app/assets",
        label: "Assets",
        module: "assets",
        children: [
          { href: "/app/assets", label: "All Assets", module: "assets" },
          { href: "/app/assets?view=maintenance", label: "Maintenance", module: "assets" },
          { href: "/app/work-requests", label: "Work requests", module: "work-requests" },
          { href: "/app/assets?view=categories", label: "Categories", module: "assets" },
        ],
      },
    ],
  },
  {
    items: [
      { href: "/app/calendar", label: "Schedule", module: "calendar" },
      { href: "/app/reports", label: "Reports", module: "reports" },
      { href: "/app/partners", label: "Partners", module: "partners" },
      { href: "/app/moderation", label: "Moderation", module: "moderation" },
    ],
  },
  {
    items: [{ href: "/settings/organisation", label: "Settings", module: "organisation" }],
  },
];

const CLIENT_NAV: NavGroup[] = [
  {
    items: [{ href: "/app/home", label: "Home", module: "home" }],
  },
  {
    label: "My fitness",
    items: [
      { href: "/app/workout", label: "Workout", module: "workout" },
      { href: "/app/progress", label: "Progress", module: "progress" },
      { href: "/app/nutrition", label: "Nutrition", module: "nutrition" },
      { href: "/app/messages", label: "Messages", module: "messages" },
      { href: "/app/schedule", label: "Schedule", module: "schedule" },
      { href: "/app/community", label: "Community", module: "community" },
    ],
  },
  {
    items: [{ href: "/app/coach-match", label: "Find a coach", module: "coach-match" }],
  },
  {
    items: [{ href: "/app/profile", label: "Profile", module: "profile" }],
  },
  {
    items: [{ href: "/app/attendance", label: "Check-in", module: "attendance" }],
  },
];

const CENTRE_MANAGER_NAV: NavGroup[] = [
  {
    items: [{ href: "/app/analytics", label: "Dashboard", module: "analytics" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/app/members", label: "Members", module: "clients" },
      { href: "/app/memberships", label: "Membership plans", module: "memberships" },
      { href: "/app/payments", label: "Payments", module: "payments" },
      { href: "/app/sessions", label: "Sessions", module: "sessions" },
      { href: "/app/staff", label: "Staff", module: "staff" },
      { href: "/app/assets", label: "Assets", module: "assets" },
      { href: "/app/work-requests", label: "Work requests", module: "work-requests" },
      { href: "/app/inventory", label: "Inventory", module: "inventory" },
      { href: "/app/leads", label: "Sales", module: "leads" },
      { href: "/app/partners", label: "Partners", module: "partners" },
      { href: "/app/moderation", label: "Moderation", module: "moderation" },
      { href: "/settings/audit", label: "Audit log", module: "audit" },
    ],
  },
];

const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  admin: ADMIN_NAV,
  centre_manager: CENTRE_MANAGER_NAV,
  trainer: TRAINER_NAV,
  client: CLIENT_NAV,
};

export function permissionsForRole(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessModule(role: AppRole, module: string): boolean {
  const permission = MODULE_PERMISSION[module];
  if (!permission) return false;
  return hasPermission(role, permission);
}

export function getNavForRole(role: AppRole): NavGroup[] {
  return NAV_BY_ROLE[role];
}

export function getRoleHome(role: AppRole): string {
  const homes: Record<AppRole, string> = {
    admin: "/app/analytics",
    centre_manager: "/app/analytics",
    trainer: "/app/dashboard",
    client: "/app/home",
  };
  return homes[role];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  centre_manager: "Centre Manager",
  trainer: "Trainer",
  client: "Client",
};

export const ROLE_PORTAL_LABEL: Record<AppRole, string> = {
  admin: "Admin Workspace",
  centre_manager: "Centre Operations",
  trainer: "Coach Life",
  client: "Member Portal",
};

export const CLIENT_TABS = [
  { slug: "", label: "Overview" },
  { slug: "program", label: "Workout Plan" },
  { slug: "progress", label: "Progress" },
  { slug: "attendance", label: "Attendance" },
  { slug: "notes", label: "Notes" },
  { slug: "measurements", label: "Measurements" },
] as const;

export const CLIENT_MORE_TABS = [
  { slug: "timeline", label: "Timeline" },
  { slug: "assessment", label: "Assessment" },
  { slug: "nutrition", label: "Nutrition" },
  { slug: "package", label: "Package" },
  { slug: "communication", label: "Messages" },
] as const;
