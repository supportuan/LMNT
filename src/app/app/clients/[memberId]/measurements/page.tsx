import { redirect } from "next/navigation";
import { ProgressSnapshotForm } from "@/components/trainer/progress-snapshot-form";
import { Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberProgressSnapshots } from "@/modules/trainer-queries";

const FIELDS = ["chest", "waist", "hips", "arm", "thigh"] as const;

export default async function ClientMeasurementsTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const snapshots = await getMemberProgressSnapshots(memberId);
  const latest = snapshots[0];
  const isTrainer = session.activeRole === "trainer" || session.activeRole === "admin";

  return (
    <div className="space-y-6">
      <Panel title="Latest measurements">
        {!latest ? (
          <p className="text-sm text-[var(--workspace-muted)]">No measurements recorded yet.</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-[var(--workspace-muted)]">Weight</dt>
              <dd className="font-mono text-xl font-bold">{latest.weight ?? "—"} kg</dd>
            </div>
            <div>
              <dt className="text-[var(--workspace-muted)]">Body fat</dt>
              <dd className="font-mono text-xl font-bold">{latest.bodyFat ?? "—"}%</dd>
            </div>
            {FIELDS.map((key) => (
              <div key={key}>
                <dt className="capitalize text-[var(--workspace-muted)]">{key}</dt>
                <dd className="font-mono text-xl font-bold">
                  {latest.measurements?.[key] ?? "—"} cm
                </dd>
              </div>
            ))}
            <div className="sm:col-span-3 text-xs text-[var(--workspace-muted)]">
              Recorded {new Date(latest.recordedAt).toLocaleString()}
            </div>
          </dl>
        )}
      </Panel>
      {isTrainer && (
        <Panel title="Record measurements">
          <ProgressSnapshotForm memberId={memberId} mode="measurements" />
        </Panel>
      )}
    </div>
  );
}
