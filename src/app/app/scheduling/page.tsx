import { redirect } from "next/navigation";
import { AssessmentScheduleList } from "@/components/admin/assessment-schedule-list";
import { AssessmentSchedulingForm } from "@/components/admin/assessment-scheduling-form";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome, hasPermission, PERMISSIONS } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getScheduleTrainers } from "@/modules/admin-queries";
import { getAssessmentScheduleRows, getCentreMembers } from "@/modules/scheduling-queries";

export const dynamic = "force-dynamic";

export default async function AssessmentSchedulingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "calendar")) redirect(getRoleHome(session.activeRole));
  if (!hasPermission(session.activeRole, PERMISSIONS.CLIENT_CREATE)) redirect(getRoleHome(session.activeRole));

  const [members, trainers, scheduled] = await Promise.all([
    getCentreMembers(session),
    getScheduleTrainers(session),
    getAssessmentScheduleRows(session),
  ]);

  return (
    <>
      <PageHeader
        title="Assessment scheduling"
        description="Screen 3 — trainer roster, free slots, goals, and trainer leads."
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Schedule assessment">
          <AssessmentSchedulingForm
            members={members.map((m) => ({
              id: m.id,
              name: m.name,
              centreId: m.centreId,
              goal: m.goal,
            }))}
            trainers={trainers.map((t) => ({
              id: t.id,
              name: t.name,
              centreId: t.centreId,
            }))}
          />
        </Panel>
        <Panel title="Trainer roster notes">
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--workspace-muted)]">
            <li>Free slots come from each trainer&apos;s client blocks on their Week timetable.</li>
            <li>Booked sessions block overlapping times for that trainer.</li>
            <li>Scheduling creates a consultation lead on the trainer&apos;s pipeline with goals attached.</li>
            <li>Use reassign below to move the assessment to another trainer or time.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Scheduled assessments">
        <AssessmentScheduleList
          rows={scheduled}
          trainers={trainers.map((t) => ({ id: t.id, name: t.name }))}
        />
      </Panel>
    </>
  );
}