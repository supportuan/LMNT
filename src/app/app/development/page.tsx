import Link from "next/link";
import { redirect } from "next/navigation";
import { CoachDnaPanel } from "@/components/trainer/coach-dna-panel";
import { PageHeader, Panel } from "@/components/ui";
import { canAccessModule, getRoleHome } from "@/lib/policy";
import { getSession } from "@/lib/session";
import { getCoachMirrorSummary } from "@/modules/development-queries";
import { getCoachDna } from "@/modules/sales-queries";

export default async function DevelopmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session.activeRole, "development")) redirect(getRoleHome(session.activeRole));

  const [dna, mirror] = await Promise.all([getCoachDna(session), getCoachMirrorSummary(session)]);

  return (
    <>
      <PageHeader
        title="My Development"
        description="Improve as a coach — not part of daily operations. Practice one focus at a time."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title="Coach Mirror">
          <p className="mb-4 text-sm text-[var(--workspace-muted)]">
            Scenario-based self-assessment across assessment, programming, coaching eye, and sales.
          </p>
          {mirror ? (
            <p className="mb-3 text-sm">
              Last score: <strong>{mirror.latest.overall}/100</strong> ({mirror.latest.headline})
              {mirror.delta != null && (
                <span className={mirror.delta >= 0 ? " text-[var(--status-success)]" : " text-[var(--status-danger)]"}>
                  {" "}
                  · {mirror.delta >= 0 ? "+" : ""}
                  {mirror.delta} vs prior
                </span>
              )}
            </p>
          ) : (
            <p className="mb-3 text-sm text-[var(--workspace-muted)]">No saved assessments yet.</p>
          )}
          <Link href="/app/development/coach-mirror" className="text-sm font-semibold text-[var(--workspace-accent)]">
            {mirror ? "Retake or compare →" : "Start Coach Mirror →"}
          </Link>
        </Panel>

        <Panel title="Coach DNA">
          <p className="mb-4 text-sm text-[var(--workspace-muted)]">
            Sales pattern intelligence from saved CLOSE OS consultation reports.
          </p>
          {dna ? (
            <p className="text-sm">
              {dna.count} reports · avg score <strong>{dna.avg}</strong> · focus: {dna.weak[0]}
            </p>
          ) : (
            <p className="text-sm text-[var(--workspace-muted)]">Run a consultation to build your DNA profile.</p>
          )}
          <Link href="/app/leads/consultation" className="mt-2 inline-block text-sm font-semibold text-[var(--workspace-accent)]">
            Run consultation →
          </Link>
        </Panel>

        <Panel title="Program design">
          <p className="mb-4 text-sm text-[var(--workspace-muted)]">
            Build 4-week blocks inside each client&apos;s Program tab — intake, body profile, publish to portal.
          </p>
          <Link href="/app/programs" className="text-sm font-semibold text-[var(--workspace-accent)]">
            View all programs →
          </Link>
        </Panel>
      </div>

      {dna && (
        <div className="mt-6">
          <CoachDnaPanel dna={dna} />
        </div>
      )}
    </>
  );
}
