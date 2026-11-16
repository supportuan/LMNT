"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DayPicker, Dialog, Field } from "@/components/dialog";
import { Button } from "@/components/ui";
import { DAY_SHORT, TIME_SLOTS, WEEK_DAYS, formatDayList } from "@/lib/coach-life/timetable";
import { sendJson } from "@/lib/send-json";

type Occupied = { dayOfWeek: number; timeSlot: string }[];

export function AddClientButton({
  occupied,
  label = "+ Client",
  variant = "secondary",
  className = "",
  autoOpenParam = "new",
  children,
}: {
  occupied: Occupied;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
  autoOpenParam?: string;
  children?: React.ReactNode;
}) {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get(autoOpenParam) === "1");
  return (
    <>
      {children ? (
        <button type="button" className={className} onClick={() => setOpen(true)}>
          {children}
        </button>
      ) : (
        <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      {open && <AddClientDialog occupied={occupied} onClose={() => setOpen(false)} />}
    </>
  );
}

function suggestSlots(occupied: Occupied, days: number[], timeSlot: string, perWeek: number) {
  const taken = new Set(occupied.map((o) => `${o.dayOfWeek}|${o.timeSlot}`));
  const pool = days.length ? WEEK_DAYS.filter((d) => days.includes(d.dow)) : WEEK_DAYS.slice(0, 6);
  return pool
    .filter((d) => !taken.has(`${d.dow}|${timeSlot}`))
    .slice(0, perWeek)
    .map((d) => d.dow);
}

function AddClientDialog({ occupied, onClose }: { occupied: Occupied; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [perWeek, setPerWeek] = useState(3);
  const [packageSessions, setPackageSessions] = useState(12);
  const [packageValue, setPackageValue] = useState(12000);
  const [due, setDue] = useState(0);
  const [time, setTime] = useState<string>("7–8am");
  const [days, setDays] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const suggestion = useMemo(() => suggestSlots(occupied, days, time, perWeek), [occupied, days, time, perWeek]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter the client's name.");
      return;
    }
    if (due > packageValue) {
      setError("Payment due can't be more than the package value.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await sendJson<{ member: { id: string; name: string } }>("/api/members", "POST", {
      name: name.trim(),
      phone: phone.trim() || undefined,
      goal: goal.trim() || undefined,
      planName: "PT Package",
      totalSessions: packageSessions,
      packageValue,
      amountDue: due,
      trainingDays: formatDayList(days) || undefined,
      trainingTime: time,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCreated({ id: res.data.member.id, name: res.data.member.name });
    router.refresh();
  }

  async function lockSlots() {
    if (!created || suggestion.length === 0) return;
    setSaving(true);
    const [first, ...rest] = suggestion;
    const res = await sendJson("/api/schedule-blocks", "POST", {
      dayOfWeek: first,
      timeSlot: time,
      blockType: "client",
      label: created.name,
      memberId: created.id,
      repeatDays: rest,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.push("/app/calendar");
    router.refresh();
  }

  if (created) {
    return (
      <Dialog title={`${created.name} added`} description="Lock in their weekly rhythm." onClose={onClose} size="sm">
        <div className="space-y-4">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
            Suggested weekly slots
          </span>
          {suggestion.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--emerald-neon-tint)] p-4 ring-1 ring-inset ring-[var(--emerald-neon)]/30">
              <span className="text-sm font-semibold text-[var(--emerald-neon)]">
                {suggestion.map((d) => DAY_SHORT[d]).join(" / ")} · {time}
              </span>
              <Button type="button" size="sm" onClick={lockSlots} disabled={saving}>
                {saving ? "Locking…" : "Lock these slots"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--workspace-muted)]">
              No preferred slots are free. Open Week to choose alternatives.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-[var(--status-danger)]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button href={`/app/clients/${created.id}`} variant="ghost">
              Open profile
            </Button>
            <Button href={`/app/calendar?book=${created.id}`} variant="secondary">
              Choose in Week
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Add client" description="Client, package and weekly rhythm in one go." onClose={onClose} size="lg">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="neu-input" required maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="neu-input" type="tel" inputMode="tel" autoComplete="off" />
          </Field>
          <Field label="Goal">
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Fat loss / strength / performance" className="neu-input" />
          </Field>
          <Field label="Sessions per week">
            <select value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} className="neu-input">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Package sessions">
            <input type="number" min={1} max={500} value={packageSessions} onChange={(e) => setPackageSessions(Number(e.target.value))} className="neu-input" required />
          </Field>
          <Field label="Package value ₹">
            <input type="number" min={0} step={100} value={packageValue} onChange={(e) => setPackageValue(Number(e.target.value))} className="neu-input" required />
          </Field>
          <Field label="Payment due ₹">
            <input type="number" min={0} step={100} value={due} onChange={(e) => setDue(Number(e.target.value))} className="neu-input" />
          </Field>
          <Field label="Preferred time">
            <select value={time} onChange={(e) => setTime(e.target.value)} className="neu-input">
              {TIME_SLOTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
            Preferred days
          </span>
          <DayPicker value={days} onChange={setDays} label="Preferred days" />
        </div>
        <Field label="Important note">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Injury, preference, reminder…"
            rows={3}
            className="neu-input"
            maxLength={2000}
          />
        </Field>
        <p className="text-xs text-[var(--workspace-subtle)]">
          {suggestion.length > 0
            ? `Free slots right now: ${suggestion.map((d) => DAY_SHORT[d]).join(" / ")} · ${time}`
            : "No matching free slots — you can choose alternatives in Week after saving."}
        </p>
        {error && (
          <p role="alert" className="text-sm text-[var(--status-danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save + suggest slots"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
