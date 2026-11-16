import { redirect } from "next/navigation";
import { MemberQuerySelect } from "@/components/admin/member-query-select";
import { CapabilityIntakeForm } from "@/components/trainer/capability-intake-form";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import type { CapabilityIntake, CapabilityProfile } from "@/lib/capability-score";
import { getSession } from "@/lib/session";
import { getCentreMembers } from "@/modules/queries";

export const dynamic = "force-dynamic";

export default async function CapabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "assessments")) redirect(getRoleHome(session.activeRole));

  const { memberId: queryMemberId } = await searchParams;
  const members = await getCentreMembers(session);
  const memberId = queryMemberId && members.some((m) => m.id === queryMemberId) ? queryMemberId : members[0]?.id;

  if (!memberId) {
    return <PageHeader title="Capability intake" description="Add members first." />;
  }

  const { assessments: assessmentTable } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { desc, eq } = await import("drizzle-orm");

  const [latest] = await db
    .select()
    .from(assessmentTable)
    .where(eq(assessmentTable.memberId, memberId))
    .orderBy(desc(assessmentTable.createdAt))
    .limit(1);

  const intake = (latest?.intakeData as CapabilityIntake | null) ?? null;
  const profile = (latest?.capabilityProfile as CapabilityProfile | null) ?? null;

  return (
    <>
      <PageHeader
        title="Capability intake"
        description="Screen 5 — PAR-Q, lifestyle, medical history, and movement screen → capability score & coaching bucket."
      />
      <Panel title="Member">
        <MemberQuerySelect members={members.map((m) => ({ id: m.id, name: m.name }))} memberId={memberId} basePath="/app/capability" />
      </Panel>
      <div className="mt-6">
        <CapabilityIntakeForm
          memberId={memberId}
          assessmentId={latest?.id}
          initialIntake={intake}
          initialProfile={profile}
          initialScore={latest?.capabilityScore}
        />
      </div>
    </>
  );
}