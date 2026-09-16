"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui";
import { CLIENT_MORE_TABS, CLIENT_TABS } from "@/lib/policy";
import { StartSessionButton } from "@/components/trainer/start-session-button";
import type { getClientWorkspace } from "@/modules/trainer-queries";

type Workspace = NonNullable<Awaited<ReturnType<typeof getClientWorkspace>>>;

export function ClientWorkspaceShell({
  memberId,
  workspace,
  children,
}: {
  memberId: string;
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { member, activeProgramme, nextSession } = workspace;
  const tabs = [...CLIENT_TABS, ...CLIENT_MORE_TABS];

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge tone="info">{member.goal ?? "Goal not set"}</Badge>
              <Badge tone="neutral">{member.status}</Badge>
            </div>
          </div>
          <StartSessionButton
            memberId={memberId}
            nextSessionId={nextSession?.id}
            programmeId={activeProgramme?.id}
          />
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-[var(--workspace-muted)]">Next session</div>
            <div className="font-medium">
              {nextSession ? new Date(nextSession.scheduledAt).toLocaleString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-[var(--workspace-muted)]">Workout plan</div>
            <div className="font-medium">{activeProgramme?.title ?? "None"}</div>
          </div>
          <div>
            <div className="text-[var(--workspace-muted)]">Sessions completed</div>
            <div className="font-medium">{workspace.completedCount}</div>
          </div>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-[var(--workspace-border)]">
        {tabs.map((tab) => {
          const href =
            tab.slug === "" ? `/app/clients/${memberId}` : `/app/clients/${memberId}/${tab.slug}`;
          const active =
            tab.slug === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-[var(--workspace-accent)] text-[var(--workspace-accent)]"
                  : "border-transparent text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
