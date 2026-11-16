import { redirect } from "next/navigation";
import { AssessmentSchedulingForm } from "@/components/admin/assessment-scheduling-form";
import { AssessmentForm } from "@/components/trainer/assessment-form";
import { CapabilityIntakeForm } from "@/components/trainer/capability-intake-form";
import type { CapabilityIntake, CapabilityProfile } from "@/lib/capability-score";
import { Badge, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { computeReadinessScore, readinessLabel } from "@/lib/coach-pro/readiness";
import { hasPermission, PERMISSIONS } from "@/lib/policy";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getScheduleTrainers } from "@/modules/admin-queries";
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
  const isTrainer =
    session.activeRole === "trainer" ||
    session.activeRole === "admin" ||
    session.activeRole === "centre_manager";
  const canSchedule = hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE);
  const trainers = canSchedule ? await getScheduleTrainers(session) : [];

  const readiness = a?.scores?.readiness ?? (a ? computeReadinessScore(a.scores ?? {}, a.parqCleared) : null);
  const readinessInfo = readiness != null ? readinessLabel(readiness) : null;

  return (
    <div className="space-y-4">
      {canSchedule && ws ? (
        <Panel title="Schedule assessment (Screen 3)">
          {a?.scheduledAt && a.status !== "completed" ? (
            <p className="mb-3 text-sm text-[var(--workspace-muted)]">
              Booked: {formatDate(a.scheduledAt)} · reassign from{" "}
              <a href="/app/scheduling" className="font-medium text-[var(--workspace-accent)]">
                Assessments
              </a>
            </p>
          ) : null}
          <AssessmentSchedulingForm
            compact
            initialMemberId={memberId}
            members={[
              {
                id: memberId,
                name: ws.member.name,
                centreId: ws.member.centreId,
                goal: ws.member.goal,
              },
            ]}
            trainers={trainers.map((t) => ({ id: t.id, name: t.name, centreId: t.centreId }))}
          />
        </Panel>
      ) : null}

      {isTrainer && (
        <Panel title="Capability intake (Screen 5)">
          <CapabilityIntakeForm
            memberId={memberId}
            assessmentId={a?.id}
            initialIntake={(a?.intakeData as CapabilityIntake | null) ?? null}
            initialProfile={(a?.capabilityProfile as CapabilityProfile | null) ?? null}
            initialScore={a?.capabilityScore}
          />
        </Panel>
      )}

      {a?.capabilityScore != null && (
        <Panel title="Capability output">
          <p className="text-lg font-semibold">Score: {a.capabilityScore}</p>
          {a.capabilityProfile && (
            <ul className="mt-2 space-y-1 text-sm">
              <li>Bucket: {(a.capabilityProfile as CapabilityProfile).bucket}</li>
              <li>Suggested days/week: {(a.capabilityProfile as CapabilityProfile).daysPerWeek}</li>
              <li>Immediate: {(a.capabilityProfile as CapabilityProfile).immediateGoal}</li>
              <li>Long term: {(a.capabilityProfile as CapabilityProfile).longTermGoal}</li>
            </ul>
          )}
        </Panel>
      )}

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
