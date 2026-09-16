"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";

type Settings = {
  maxConsecutiveSessions: number;
  trainingDays: string | null;
  trainingTime: string | null;
  mealWindow: string | null;
  lifeNotes: string | null;
  nonNegotiables: { label: string; done: boolean }[];
};

type Block = {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  blockType: string;
  label: string;
};

const BLOCK_TYPES = ["deep_work", "admin", "life", "shutdown"] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MeBoundariesForm({
  settings,
  blocks,
}: {
  settings: Settings;
  blocks: Block[];
}) {
  const router = useRouter();
  const [maxSessions, setMaxSessions] = useState(String(settings.maxConsecutiveSessions));
  const [trainingDays, setTrainingDays] = useState(settings.trainingDays ?? "");
  const [trainingTime, setTrainingTime] = useState(settings.trainingTime ?? "");
  const [mealWindow, setMealWindow] = useState(settings.mealWindow ?? "");
  const [lifeNotes, setLifeNotes] = useState(settings.lifeNotes ?? "");
  const [nonNegotiables, setNonNegotiables] = useState(settings.nonNegotiables);
  const [saving, setSaving] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const [protectMessage, setProtectMessage] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/trainer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxConsecutiveSessions: Number(maxSessions),
        trainingDays,
        trainingTime,
        mealWindow,
        lifeNotes,
        nonNegotiables,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function protectMyLife() {
    setProtecting(true);
    setProtectMessage(null);
    await saveSettings();
    const res = await fetch("/api/trainer/protect-life", { method: "POST" });
    setProtecting(false);
    if (res.ok) {
      const data = (await res.json()) as { created?: number; existing?: number };
      const created = data.created ?? 0;
      setProtectMessage(
        created > 0
          ? `Protected ${created} new life block${created === 1 ? "" : "s"} from your settings.`
          : "Life blocks already match your training days and times.",
      );
      router.refresh();
    } else {
      setProtectMessage("Could not sync life blocks. Check training days and time.");
    }
  }

  async function addBlock() {
    await fetch("/api/schedule-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: 1,
        timeSlot: "3–4pm",
        blockType: "life",
        label: "Own training",
      }),
    });
    router.refresh();
  }

  async function removeBlock(id: string) {
    await fetch(`/api/schedule-blocks?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function toggleNonNeg(index: number) {
    const next = nonNegotiables.map((n, i) =>
      i === index ? { ...n, done: !n.done } : n,
    );
    setNonNegotiables(next);
  }

  const defaultNonNeg = [
    { label: "Deep work block", done: false },
    { label: "Admin shutdown", done: false },
    { label: "Recovery protected", done: false },
  ];
  const checklist = nonNegotiables.length > 0 ? nonNegotiables : defaultNonNeg;

  return (
    <div className="space-y-6">
      <Panel title="Capacity & boundaries">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Max sessions / day</span>
            <input
              type="number"
              min={1}
              max={12}
              value={maxSessions}
              onChange={(e) => setMaxSessions(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Training days</span>
            <input
              value={trainingDays}
              onChange={(e) => setTrainingDays(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Training time</span>
            <input
              value={trainingTime}
              onChange={(e) => setTrainingTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--workspace-muted)]">Meal window</span>
            <input
              value={mealWindow}
              onChange={(e) => setMealWindow(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-[var(--workspace-muted)]">Life notes</span>
          <textarea
            value={lifeNotes}
            onChange={(e) => setLifeNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-[var(--workspace-border)] px-3 py-2"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button type="button" variant="secondary" onClick={protectMyLife} disabled={protecting}>
            {protecting ? "Protecting…" : "Protect my life"}
          </Button>
        </div>
        {protectMessage ? (
          <p className="mt-2 text-sm text-[var(--workspace-muted)]">{protectMessage}</p>
        ) : null}
      </Panel>

      <Panel title="Non-negotiables">
        <div className="space-y-2">
          {checklist.map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleNonNeg(i)}
              />
              {item.label}
            </label>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3" size="sm" onClick={saveSettings}>
          Save checklist
        </Button>
      </Panel>

      <Panel
        title="Week blocks"
        action={
          <Button type="button" size="sm" onClick={addBlock}>
            + Life block
          </Button>
        }
      >
        {blocks.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">
            No protected blocks yet. Add life, deep work, or shutdown slots.
          </p>
        ) : (
          <div className="space-y-2">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
              >
                <span>
                  {DAYS[b.dayOfWeek]} · {b.timeSlot} · {b.label}{" "}
                  <span className="text-[var(--workspace-muted)]">({b.blockType})</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(b.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--workspace-muted)]">
          Block types: {BLOCK_TYPES.join(", ")}
        </p>
      </Panel>
    </div>
  );
}
