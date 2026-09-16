import { redirect } from "next/navigation";
import { ModerationPanel } from "@/components/community/moderation-panel";
import { PageHeader, StatCard } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getModerationQueue, getModerationStats } from "@/modules/community-queries";

export default async function ModerationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "moderation")) redirect(getRoleHome(session.activeRole));

  const [reports, stats] = await Promise.all([
    getModerationQueue(session),
    getModerationStats(session),
  ]);

  return (
    <>
      <PageHeader
        title="Message moderation"
        description="Review reported messages, dismiss false positives, or remove content."
      />

      <div className="mb-6 grid gap-[var(--grid-gutter)] sm:grid-cols-3">
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Escalated" value={stats.escalated} />
        <StatCard label="Resolved" value={stats.resolved} />
      </div>

      <ModerationPanel reports={reports} />
    </>
  );
}
