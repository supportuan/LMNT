import { redirect } from "next/navigation";
import { Badge, Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import { getSession } from "@/lib/session";
import { getMemberTimeline, type TimelineEntry } from "@/modules/member-timeline";

const TYPE_LABELS: Record<TimelineEntry["type"], string> = {
  member_created: "Profile",
  lead_converted: "Lead",
  coaching_started: "Coaching",
  assessment: "Assessment",
  programme: "Programme",
  session: "Session",
  payment: "Payment",
  attendance: "Attendance",
  progress: "Progress",
  onboarding: "Onboarding",
};

function toneForEntry(entry: TimelineEntry): "info" | "warning" | "danger" | "neutral" {
  if (entry.type === "session" && entry.detail?.includes("Pain")) return "danger";
  if (entry.type === "assessment" && entry.detail?.includes("Referral")) return "warning";
  if (entry.status === "completed" || entry.status === "active") return "info";
  return "neutral";
}

export default async function ClientTimelineTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeRole === "client") redirect("/app/home");
  await assertMemberAccess(session, memberId);

  const entries = await getMemberTimeline(session, memberId);

  return (
    <Panel title="Member timeline">
      <p className="mb-4 text-sm text-[var(--workspace-muted)]">
        Unified history — sessions, assessments, programmes, payments, and coaching events.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--workspace-muted)]">No timeline events yet.</p>
      ) : (
        <ol className="relative space-y-0 border-l border-[var(--workspace-border)] pl-6">
          {entries.map((entry) => (
            <li key={entry.id} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--workspace-accent)] bg-[var(--workspace-surface)]" />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{entry.title}</span>
                    <Badge tone={toneForEntry(entry)}>{TYPE_LABELS[entry.type]}</Badge>
                    {entry.status ? (
                      <span className="text-xs capitalize text-[var(--workspace-muted)]">
                        {entry.status.replace(/_/g, " ")}
                      </span>
                    ) : null}
                  </div>
                  {entry.detail ? (
                    <p className="mt-1 text-sm text-[var(--workspace-muted)]">{entry.detail}</p>
                  ) : null}
                </div>
                <time
                  dateTime={entry.occurredAt}
                  className="shrink-0 text-xs text-[var(--workspace-muted)]"
                >
                  {new Date(entry.occurredAt).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
