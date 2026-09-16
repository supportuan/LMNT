import { redirect } from "next/navigation";
import { OnboardingChecklist } from "@/components/trainer/onboarding-checklist";
import { AttentionItem, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getClientWorkspace } from "@/modules/trainer-queries";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "clients")) redirect(getRoleHome(session.activeRole));
  await assertMemberAccess(session, memberId);

  const ws = await getClientWorkspace(session, memberId);
  if (!ws) redirect("/app/clients");

  const latest = ws.sessions[0];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Coach attention">
        <div className="space-y-2">
          {ws.coachAttention.map((msg, i) => (
            <AttentionItem
              key={i}
              title={msg}
              detail=""
              tone={msg.includes("discomfort") ? "danger" : msg.includes("review") || msg.includes("due") ? "warning" : "info"}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Snapshot">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Primary goal</dt>
            <dd className="font-medium">{ws.member.goal ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Active program</dt>
            <dd className="font-medium">{ws.activeProgramme?.title ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Latest RPE</dt>
            <dd className="font-medium">{latest?.rpe ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Assessment</dt>
            <dd className="font-medium">{ws.latestAssessment?.status ?? "Not started"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--workspace-muted)]">Payment / package</dt>
            <dd className="font-medium">{ws.plan?.planName ?? "—"}</dd>
          </div>
        </dl>
      </Panel>

      {ws.onboarding && session.activeRole !== "client" && (
        <Panel title="Onboarding checklist" elevated>
          <OnboardingChecklist
            assignmentId={ws.onboarding.id}
            checklist={ws.onboarding.checklist}
            status={ws.onboarding.status}
          />
        </Panel>
      )}
    </div>
  );
}
