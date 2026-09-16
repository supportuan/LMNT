import { MODULE_PERMISSION } from "@/lib/permissions";
import { canAccessModule, getRoleHome, type AppRole } from "@/lib/policy";

/** Map URL prefixes to module keys for RBAC middleware */
export function moduleForPath(pathname: string): string | null {
  if (pathname.startsWith("/settings/organisation")) return "organisation";
  if (pathname.startsWith("/settings/audit")) return "audit";
  if (pathname.startsWith("/app/clients")) return "clients";
  if (pathname.startsWith("/app/sessions")) return "sessions";
  if (pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/calendar") || pathname.startsWith("/app/schedule")) {
    return pathname.startsWith("/app/schedule") ? "schedule" : "calendar";
  }
  if (pathname.startsWith("/app/programs") || pathname.startsWith("/app/programmes")) return "programs";
  if (pathname.startsWith("/app/progress")) return "progress";
  if (pathname.startsWith("/app/leads") || pathname.startsWith("/app/sales")) return "leads";
  if (pathname.startsWith("/app/money")) return "money";
  if (pathname.startsWith("/app/me")) return "me";
  if (pathname.startsWith("/app/development")) return "development";
  if (pathname.startsWith("/app/analytics") || pathname.startsWith("/app/overview")) return "analytics";
  if (pathname.startsWith("/app/staff")) return "staff";
  if (pathname.startsWith("/app/home")) return "home";
  if (pathname.startsWith("/app/workout")) return "workout";
  if (pathname.startsWith("/app/nutrition")) return "nutrition";
  if (pathname.startsWith("/app/messages")) return "messages";
  if (pathname.startsWith("/app/profile")) return "profile";
  if (pathname.startsWith("/app/coach-match")) return "coach-match";
  if (pathname.startsWith("/app/community")) return "community";
  if (pathname.startsWith("/app/partners")) return "partners";
  if (pathname.startsWith("/app/moderation")) return "moderation";
  if (pathname.startsWith("/app/attendance")) return "attendance";
  if (pathname.startsWith("/app/coach-pro")) return "coach-pro";
  if (pathname.startsWith("/app/close-os")) return "close-os";
  if (pathname.startsWith("/app/coach-mirror")) return "development";
  if (pathname.startsWith("/app/workout-planner")) return "workout-planner";
  if (pathname.startsWith("/app/ai-coach")) return "ai-coach";
  if (pathname.startsWith("/app/sales")) return "leads";
  if (pathname.startsWith("/app/tasks")) return "dashboard";
  if (pathname.startsWith("/app/memberships")) return "memberships";
  if (pathname.startsWith("/app/payments")) return "payments";
  if (pathname.startsWith("/app/reports")) return "reports";
  if (pathname.startsWith("/app/assets")) return "assets";
  if (pathname.startsWith("/app/work-requests")) return "work-requests";
  if (pathname.startsWith("/app/inventory")) return "inventory";
  if (pathname.startsWith("/app/onboarding")) return "onboarding";
  if (pathname.startsWith("/app/assessments")) return "assessments";
  if (pathname.startsWith("/app/members")) return "clients";
  return null;
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  if (pathname.startsWith("/app") || pathname.startsWith("/settings")) {
    const moduleKey = moduleForPath(pathname);
    if (!moduleKey) return false;
    const permission = MODULE_PERMISSION[moduleKey];
    if (!permission) return false;
    return canAccessModule(role, moduleKey);
  }
  return true;
}

export function redirectForUnauthorized(role: AppRole, pathname: string): string {
  const home = getRoleHome(role);
  if (pathname.startsWith("/app/dashboard") && role !== "trainer") return home;
  return home;
}
