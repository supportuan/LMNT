import { redirect } from "next/navigation";
import { ProgramBuilder } from "@/components/trainer/program-builder";
import { Panel } from "@/components/ui";
import { assertMemberAccess } from "@/lib/access";
import type { WeekPlan } from "@/lib/coach-pro/engine";
import { getSession } from "@/lib/session";
import { getClientWorkspace } from "@/modules/trainer-queries";

type ProgrammeContent = {
  weeks?: WeekPlan[];
  goal?: string;
  daysPerWeek?: number;
  visualProfile?: string;
  markdown?: string;
};

function LegacyProgramView({ title, markdown }: { title: string; markdown: string }) {
  const lines = markdown.split("\n").filter(Boolean);
  return (
    <Panel title={title}>
      <div className="space-y-3 text-sm leading-relaxed text-[var(--workspace-text)]">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) {
            return (
              <h3 key={i} className="text-base font-semibold">
                {line.slice(2)}
              </h3>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <li key={i} className="ml-4 list-disc text-[var(--workspace-muted)]">
                {line.slice(2)}
              </li>
            );
          }
          return (
            <p key={i} className="text-[var(--workspace-muted)]">
              {line}
            </p>
          );
        })}
      </div>
    </Panel>
  );
}

export default async function ClientProgramTab({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  await assertMemberAccess(session, memberId);

  const ws = await getClientWorkspace(session, memberId);
  const isTrainer = session.activeRole === "trainer" || session.activeRole === "admin";
  const programme = ws?.latestProgramme ?? ws?.activeProgramme;

  if (!isTrainer) {
    const active = ws?.activeProgramme;
    const content = active?.content as ProgrammeContent | undefined;
    if (!active) {
      return (
        <Panel title="Program">
          <p className="text-sm text-[var(--workspace-muted)]">No active program published yet.</p>
        </Panel>
      );
    }
    if (content?.weeks?.[0]?.days?.[0]) {
      return (
        <Panel title={active.title ?? "Program"}>
          <ul className="space-y-2 text-sm">
            {content.weeks[0].days[0].exercises.map((ex) => (
              <li key={ex.id} className="flex justify-between border-b border-[var(--workspace-border)] py-2">
                <span className="font-medium">{ex.name}</span>
                <span className="font-mono text-[var(--workspace-muted)]">{ex.prescription}</span>
              </li>
            ))}
          </ul>
        </Panel>
      );
    }
    if (content?.markdown) {
      return <LegacyProgramView title={active.title ?? "Program"} markdown={content.markdown} />;
    }
    return (
      <Panel title={active.title ?? "Program"}>
        <p className="text-sm text-[var(--workspace-muted)]">
          Your coach is preparing your program — check back after your next session.
        </p>
      </Panel>
    );
  }

  return (
    <ProgramBuilder
      memberId={memberId}
      memberName={ws?.member.name ?? "Client"}
      programmeId={programme?.id}
      status={programme?.status ?? ws?.activeProgramme?.status}
      initialContent={programme?.content as ProgrammeContent | undefined}
      assessment={ws?.latestAssessment ?? null}
    />
  );
}
