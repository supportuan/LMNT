import Link from "next/link";
import { AttentionItem, Panel } from "@/components/ui";
import type { LifeBlockConflict } from "@/lib/coach-life/life-blocks";

export function LifeConflictsPanel({ conflicts }: { conflicts: LifeBlockConflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <Panel title="Life block conflicts">
      <p className="mb-3 text-sm text-[var(--workspace-muted)]">
        These sessions overlap protected recovery or training blocks. Reschedule or adjust boundaries in{" "}
        <Link href="/app/me" className="text-[var(--workspace-accent)] hover:underline">
          Me
        </Link>
        .
      </p>
      <div className="space-y-2">
        {conflicts.map((c) => (
          <Link key={c.sessionId} href={`/app/sessions/${c.sessionId}`} className="block hover:opacity-90">
            <AttentionItem
              title={`${c.memberName} — ${c.blockLabel}`}
              detail={`${new Date(c.scheduledAt).toLocaleString()} overlaps ${c.timeSlot}`}
              tone="warning"
            />
          </Link>
        ))}
      </div>
    </Panel>
  );
}
