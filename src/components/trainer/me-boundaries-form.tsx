"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DayPicker, Field } from "@/components/dialog";
import { Button } from "@/components/ui";
import { formatDayList, parseDayList, TIME_SLOTS } from "@/lib/coach-life/timetable";
import { sendJson } from "@/lib/send-json";

type Settings = {
  maxConsecutiveSessions: number;
  trainingDays: string | null;
  trainingTime: string | null;
  mealWindow: string | null;
  lifeNotes: string | null;
  shutdownTime: string;
  weeklyReview: { weekOf: string; worked: string; fix: string } | null;
};

const SHUTDOWN_OPTIONS = ["8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"] as const;

export function MeBoundariesForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [days, setDays] = useState(() => parseDayList(settings.trainingDays));
  const [trainingTime, setTrainingTime] = useState(settings.trainingTime ?? "6–7am");
  const [mealWindow, setMealWindow] = useState(settings.mealWindow ?? "1–2pm");
  const [maxSessions, setMaxSessions] = useState(String(settings.maxConsecutiveSessions));
  const [lifeNotes, setLifeNotes] = useState(settings.lifeNotes ?? "");
  const [shutdownTime, setShutdownTime] = useState(settings.shutdownTime || "10:00 PM");
  const [worked, setWorked] = useState(settings.weeklyReview?.worked ?? "");
  const [fix, setFix] = useState(settings.weeklyReview?.fix ?? "");
  const [saving, setSaving] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveBoundaries(alsoProtect: boolean) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await sendJson("/api/trainer/settings", "PATCH", {
      maxConsecutiveSessions: Number(maxSessions) || 6,
      trainingDays: formatDayList(days),
      trainingTime,
      mealWindow,
      lifeNotes,
      shutdownTime,
      syncLifeBlocks: alsoProtect,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    if (alsoProtect) {
      const synced = (res.data as { lifeBlocksSynced?: { created?: number } })?.lifeBlocksSynced;
      const created = synced?.created ?? 0;
      setMessage(
        created > 0
          ? `Saved and protected ${created} life block${created === 1 ? "" : "s"}.`
          : "Boundaries saved. Life blocks already match your settings.",
      );
    } else {
      setMessage("Boundaries saved.");
    }
    router.refresh();
    return true;
  }

  async function protectMyLife() {
    setProtecting(true);
    const ok = await saveBoundaries(false);
    if (!ok) {
      setProtecting(false);
      return;
    }
    const res = await sendJson<{ created: number; skipped: number; existing: number }>(
      "/api/trainer/protect-life",
      "POST",
    );
    setProtecting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const { created, skipped } = res.data;
    setMessage(
      created > 0
        ? `Protected ${created} block${created === 1 ? "" : "s"}${skipped ? ` · ${skipped} slot(s) already taken` : ""}.`
        : skipped
          ? `No free slots — ${skipped} already taken. Free a cell on Week first.`
          : "Your life blocks are already protected.",
    );
    router.refresh();
  }

  async function saveReview(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await sendJson("/api/trainer/settings", "PATCH", {
      weeklyReview: { worked, fix },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage("Friday review saved.");
    router.refresh();
  }

  return (
    <div className="space-y-[var(--grid-gutter)]">
      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="text-base font-semibold tracking-tight">Protect my life</h2>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
          These boundaries feed Auto Protect on Week and the energy score on Today.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
              Own training days
            </div>
            <DayPicker value={days} onChange={setDays} label="Own training days" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Training time">
              <select value={trainingTime} onChange={(e) => setTrainingTime(e.target.value)} className="neu-input">
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Meal / recovery window">
              <select value={mealWindow} onChange={(e) => setMealWindow(e.target.value)} className="neu-input">
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Max consecutive sessions" hint="Today flags overload past this number.">
              <input
                type="number"
                min={1}
                max={12}
                value={maxSessions}
                onChange={(e) => setMaxSessions(e.target.value)}
                className="neu-input"
              />
            </Field>
            <Field label="Personal commitments" hint="Shown only to you.">
              <input
                value={lifeNotes}
                onChange={(e) => setLifeNotes(e.target.value)}
                className="neu-input"
                placeholder="Family dinner Thu, physio Fri…"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => saveBoundaries(false)} disabled={saving || protecting}>
            {saving ? "Saving…" : "Save My Boundaries"}
          </Button>
          <Button type="button" variant="secondary" onClick={protectMyLife} disabled={saving || protecting}>
            {protecting ? "Protecting…" : "Auto Protect My Life"}
          </Button>
        </div>
        {(message || error) && (
          <p role="status" className={`mt-3 text-sm ${error ? "text-[var(--status-danger)]" : "text-[var(--workspace-muted)]"}`}>
            {error ?? message}
          </p>
        )}
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="text-base font-semibold tracking-tight">Daily shutdown</h2>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">Pick when the coaching day ends. Protect it on Week as a shutdown block.</p>
        <div className="mt-4 max-w-xs">
          <Field label="Shutdown target">
            <select
              value={shutdownTime}
              onChange={(e) => setShutdownTime(e.target.value)}
              className="neu-input"
            >
              {SHUTDOWN_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button type="button" className="mt-4" variant="secondary" size="sm" onClick={() => saveBoundaries(false)} disabled={saving}>
          Save shutdown
        </Button>
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="text-base font-semibold tracking-tight">Friday 60-second review</h2>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">
          {settings.weeklyReview?.weekOf
            ? `Last saved for week of ${settings.weeklyReview.weekOf}.`
            : "Capture what worked and what to fix before the next week starts."}
        </p>
        <form onSubmit={saveReview} className="mt-4 space-y-4">
          <Field label="What worked">
            <textarea
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
              rows={3}
              className="neu-input resize-y"
              placeholder="Sessions landed, boundaries held…"
            />
          </Field>
          <Field label="What needs fixing">
            <textarea
              value={fix}
              onChange={(e) => setFix(e.target.value)}
              rows={3}
              className="neu-input resize-y"
              placeholder="Overbooked Tue, follow-ups slipped…"
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save review"}
          </Button>
        </form>
      </section>
    </div>
  );
}
