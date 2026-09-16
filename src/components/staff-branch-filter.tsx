"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import type { StaffBranchSummary } from "@/modules/queries";

function staffHref(branch: string, role: string) {
  const params = new URLSearchParams();
  if (branch !== "all") params.set("branch", branch);
  if (role !== "all") params.set("role", role);
  const query = params.toString();
  return query ? `/app/staff?${query}` : "/app/staff";
}

function pillClass(active: boolean) {
  return active
    ? "border-[var(--workspace-accent)] text-[var(--workspace-accent)] bg-[var(--workspace-accent)]/5"
    : "border-[var(--workspace-border)] text-[var(--workspace-muted)] hover:border-[var(--workspace-accent)]/40";
}

function cardClass(active: boolean) {
  return `block w-full rounded-[16px] p-4 text-left transition ${
    active
      ? "neu-pressed ring-1 ring-[var(--workspace-accent)]/40"
      : "neu-card hover:border-[var(--workspace-accent)]/30"
  }`;
}

function BranchCardBody({
  title,
  subtitle,
  stats,
  badge,
}: {
  title: string;
  subtitle: string;
  stats: { label: string; value: string | number }[];
  badge?: { label: string; tone: "success" | "warning" | "neutral" };
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[var(--workspace-text)]">{title}</div>
          <div className="mt-0.5 text-xs text-[var(--workspace-muted)]">{subtitle}</div>
        </div>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-lg font-bold text-[var(--workspace-text)]">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--workspace-muted)]">{s.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function BranchCard({
  href,
  active,
  title,
  subtitle,
  stats,
  badge,
  centreId,
  switchWorkspace,
}: {
  href: string;
  active: boolean;
  title: string;
  subtitle: string;
  stats: { label: string; value: string | number }[];
  badge?: { label: string; tone: "success" | "warning" | "neutral" };
  centreId?: string | null;
  switchWorkspace?: boolean;
}) {
  if (!switchWorkspace || centreId === undefined) {
    return (
      <Link href={href} className={cardClass(active)}>
        <BranchCardBody title={title} subtitle={subtitle} stats={stats} badge={badge} />
      </Link>
    );
  }

  async function switchToBranch() {
    const res = await fetch("/api/auth/switch-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centreId }),
    });
    if (!res.ok) return;
    window.location.assign("/app/analytics");
  }

  return (
    <button type="button" onClick={() => void switchToBranch()} className={cardClass(active)}>
      <BranchCardBody title={title} subtitle={subtitle} stats={stats} badge={badge} />
    </button>
  );
}

const ROLE_FILTERS = [
  { label: "All roles", value: "all" },
  { label: "Trainers", value: "trainer" },
  { label: "Managers", value: "centre_manager" },
  { label: "Admin", value: "admin" },
] as const;

export function StaffBranchFilter({
  branch,
  role,
  branches,
  orgWide,
  totals,
  switchWorkspace,
}: {
  branch: string;
  role: string;
  branches: StaffBranchSummary[];
  orgWide: { totalStaff: number; admins: number };
  totals: { totalStaff: number; trainers: number; managers: number; active: number };
  switchWorkspace?: boolean;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BranchCard
          href={staffHref("all", role)}
          active={branch === "all"}
          title="All branches"
          subtitle={`${totals.active} active staff org-wide`}
          stats={[
            { label: "Staff", value: totals.totalStaff },
            { label: "Trainers", value: totals.trainers },
            { label: "Managers", value: totals.managers },
          ]}
          centreId={null}
          switchWorkspace={switchWorkspace}
        />
        {branches.map((b) => (
          <BranchCard
            key={b.id}
            href={staffHref(b.id, role)}
            active={branch === b.id}
            title={b.name}
            subtitle={`${b.memberCount} members · ${b.utilisationPct}% capacity`}
            stats={[
              { label: "Staff", value: b.totalStaff },
              { label: "Trainers", value: b.trainerCount },
              { label: "Managers", value: b.managerCount },
            ]}
            badge={
              b.utilisationPct > 80
                ? { label: "High load", tone: "warning" }
                : { label: "OK", tone: "success" }
            }
            centreId={b.id}
            switchWorkspace={switchWorkspace}
          />
        ))}
        {orgWide.totalStaff > 0 && (
          <BranchCard
            href={staffHref("org", role)}
            active={branch === "org"}
            title="Organisation"
            subtitle="Org-wide roles (no branch assignment)"
            stats={[
              { label: "Staff", value: orgWide.totalStaff },
              { label: "Admins", value: orgWide.admins },
              { label: "Active", value: orgWide.totalStaff },
            ]}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--workspace-muted)]">
          Role
        </span>
        {ROLE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={staffHref(branch, f.value)}
            className={`rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors ${pillClass(role === f.value)}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
