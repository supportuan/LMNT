"use client";

import { useState } from "react";
import { Button, Panel } from "@/components/ui";

type Block = {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  blockType: string;
  label: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_COLORS: Record<string, string> = {
  client: "bg-[var(--emerald-neon-tint)] text-[var(--emerald-neon)]",
  deep_work: "bg-[var(--moss-tint)] text-[var(--workspace-text)]",
  admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  life: "bg-[var(--emerald-neon-tint)] text-[var(--emerald-neon)]",
  shutdown: "bg-[var(--workspace-secondary-muted)] text-[var(--workspace-muted)]",
};

/** Compatibility panel for older calendar page imports. */
export function WeekTimetablePanel({ blocks }: { blocks: Block[] }) {
  const [expanded, setExpanded] = useState(true);

  if (blocks.length === 0) return null;

  return (
    <Panel title="Week timetable" elevated>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--workspace-muted)]">
          Protected blocks from Me & boundaries — client rhythm and recovery.
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>
      {expanded && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-2">
            {DAYS.map((day, dayIndex) => {
              const dayBlocks = blocks.filter((b) => b.dayOfWeek === dayIndex);
              return (
                <div key={day} className="rounded-md border border-[var(--workspace-border)] p-2">
                  <div className="mb-2 text-xs font-semibold uppercase text-[var(--workspace-muted)]">
                    {day}
                  </div>
                  {dayBlocks.length === 0 ? (
                    <p className="text-xs text-[var(--workspace-muted)]">—</p>
                  ) : (
                    dayBlocks.map((b) => (
                      <div
                        key={b.id}
                        className={`mb-1 rounded px-2 py-1 text-xs ${TYPE_COLORS[b.blockType] ?? "bg-[var(--workspace-secondary-muted)]"}`}
                      >
                        <div className="font-medium">{b.timeSlot}</div>
                        <div>{b.label}</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Button href="/app/me" variant="secondary" size="sm" className="mt-3">
        Edit timetable →
      </Button>
    </Panel>
  );
}
