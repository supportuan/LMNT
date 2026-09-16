import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { getNavForRole, ROLE_LABELS, ROLE_PORTAL_LABEL, getRoleHome } from "@/lib/policy";
import { workspaceCentreLabel } from "@/lib/branch-scope";
import { BranchSwitcher } from "@/components/branch-switcher";
import { RoleSwitcher } from "@/components/role-switcher";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { getCentresForSession } from "@/modules/queries";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return null;

  const navGroups = getNavForRole(session.activeRole);
  const isTrainer = session.activeRole === "trainer";
  const isAdmin = session.activeRole === "admin";
  const branches = isAdmin ? await getCentresForSession(session) : [];
  const themeClass =
    session.activeRole === "centre_manager"
      ? "theme-kinetic-dark theme-kinetic-manager"
      : session.activeRole === "client"
        ? "theme-kinetic-dark theme-kinetic-client"
        : session.activeRole === "admin"
          ? "theme-kinetic-dark theme-kinetic-admin"
          : "theme-kinetic-dark theme-kinetic-trainer";

  const centreLabel = workspaceCentreLabel(session);

  const initials = session.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex min-h-screen ${themeClass}`}>
      <aside
        className="sticky top-0 flex h-dvh max-h-dvh w-60 min-w-60 max-w-60 shrink-0 flex-col overflow-visible border-r"
        style={{
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        <div className="relative z-20 shrink-0 overflow-visible border-b px-5 py-4" style={{ borderColor: "var(--sidebar-border)" }}>
          <Link href={getRoleHome(session.activeRole)} className="block">
            <Image
              src="/logo.png"
              alt="LMNT Fitness Club"
              width={353}
              height={133}
              className="h-auto w-full"
              priority
            />
            <div className="mt-2 text-[13px] font-semibold tracking-tight text-[var(--sidebar-muted)]">
              {isTrainer ? "Trainer OS" : ROLE_PORTAL_LABEL[session.activeRole]}
            </div>
          </Link>
          {isAdmin ? (
            <BranchSwitcher branches={branches} activeCentreId={session.activeCentreId ?? null} />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<div className="flex-1 px-3 py-4" />}>
            <SidebarNav groups={navGroups} />
          </Suspense>
        </div>

        <div className="shrink-0 space-y-3 border-t p-4" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center justify-start gap-3">
            <div className="neu-control flex h-9 w-9 items-center justify-center text-xs font-bold text-[var(--workspace-accent-text)]"
              style={{ background: "var(--sidebar-accent)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{session.name}</div>
              <div className="truncate text-[10px] text-[var(--sidebar-muted)]">
                {ROLE_LABELS[session.activeRole]}
                {centreLabel ? ` · ${centreLabel}` : ""}
              </div>
            </div>
          </div>
          <RoleSwitcher roles={session.roles} activeRole={session.activeRole} />
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto" style={{ background: "var(--workspace-bg)" }}>
        <div className="mx-auto max-w-7xl p-5 md:p-7 xl:p-8">{children}</div>
      </main>
    </div>
  );
}
