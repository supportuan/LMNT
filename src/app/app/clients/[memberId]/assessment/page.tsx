import { redirect } from "next/navigation";
import { AssessmentForm } from "@/components/trainer/assessment-form";
import { Badge, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { computeReadinessScore, readinessLabel } from "@/lib/coach-pro/readiness";
import { getSession } from "@/lib/session";
import { getClientWorkspace } from "@/modules/trainer-queries";

export default async function ClientAssessmentTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const ws = await getClientWorkspace(session, memberId);
  const a = ws?.latestAssessment;
  const isTrainer = session.activeRole === "trainer" || session.activeRole === "admin";

  const readiness = a?.scores?.readiness ?? (a ? computeReadinessScore(a.scores ?? {}, a.parqCleared) : null);
  const readinessInfo = readiness != null ? readinessLabel(readiness) : null;

  return (
    <div className="space-y-4">
      {a && (
        <Panel title="Current assessment">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone={a.referralRequired ? "warning" : "success"}>{a.status}</Badge>
            {readinessInfo && (
              <Badge tone={readinessInfo.tone}>
                Readiness {readiness} — {readinessInfo.label}
              </Badge>
            )}
            <span className="text-[var(--workspace-muted)]">
              PAR-Q: {a.parqCleared ? "Cleared" : "Pending"}
            </span>
          </div>
        </Panel>
      )}

      {isTrainer ? (
        <Panel title={a ? "Update assessment" : "New assessment"}>
          <AssessmentForm
            memberId={memberId}
            initial={
              a
                ? {
                    id: a.id,
                    status: a.status,
                    parqCleared: a.parqCleared,
                    referralRequired: a.referralRequired,
                    scores: a.scores,
                    notes: a.notes,
                  }
                : null
            }
          />
        </Panel>
      ) : (
        <Panel title="Assessment">
          {!a ? (
            <p className="text-sm text-[var(--workspace-muted)]">Your coach has not completed an assessment yet.</p>
          ) : (
            <p className="text-sm">Status: {a.status}. Contact your coach for details.</p>
          )}
        </Panel>
      )}

      <p className="text-xs text-[var(--workspace-muted)]">
        Coaching consideration only — not a medical diagnosis.
      </p>
    </div>
  );
}
