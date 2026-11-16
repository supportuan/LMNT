"use client";

import Link from "next/link";
import { useState } from "react";
import { AddClientButton } from "@/components/coach-os/add-client";
import { SessionDoneDialog } from "@/components/coach-os/session-done";
import { sendJson } from "@/lib/send-json";

function SaveState({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  return (
    <span
      role="status"
      className={`text-[11px] ${state === "error" ? "text-[var(--status-danger)]" : "text-[var(--workspace-subtle)]"}`}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Couldn't save"}
    </span>
  );
}

export function Top3Panel({ initial }: { initial: string[] }) {
  const [items, setItems] = useState(() => [0, 1, 2].map((i) => initial[i] ?? ""));
  const [saved, setSaved] = useState(items.join("\n"));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function persist() {
    const key = items.join("\n");
    if (key === saved) return;
    setState("saving");
    const res = await sendJson("/api/trainer/settings", "PATCH", { top3: items.map((s) => s.trim()) });
    if (res.ok) {
      setSaved(key);
      setState("saved");
    } else setState("error");
  }

  return (
    <section className="neu-card p-[var(--card-padding)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Today&apos;s Top 3</h2>
        <SaveState state={state} />
      </div>
      <ol className="space-y-2">
        {items.map((value, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--moss-tint)] text-xs font-bold text-[var(--moss-300)]">
              {i + 1}
            </span>
            <input
              aria-label={`Priority ${i + 1}`}
              value={value}
              onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
              onBlur={persist}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="neu-input py-2 font-semibold"
              maxLength={120}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NonNegotiablesPanel({ initial }: { initial: { label: string; done: boolean }[] }) {
  const [items, setItems] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const done = items.filter((i) => i.done).length;

  async function toggle(index: number) {
    const next = items.map((n, i) => (i === index ? { ...n, done: !n.done } : n));
    setItems(next);
    setState("saving");
    const res = await sendJson("/api/trainer/settings", "PATCH", { nonNegotiables: next });
    setState(res.ok ? "saved" : "error");
    if (!res.ok) setItems(items);
  }

  return (
    <section className="neu-card p-[var(--card-padding)]">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Non-negotiables</h2>
        <span className="text-xs font-semibold tabular-nums text-[var(--emerald-neon)]">
          {done}/{items.length}
        </span>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] text-[var(--workspace-subtle)]">Resets every morning.</p>
        <SaveState state={state} />
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={item.label}>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-[10px] px-2 text-sm transition hover:bg-[var(--moss-tint)]">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(i)}
                className="h-4 w-4 accent-[var(--emerald-neon)]"
              />
              <span className={item.done ? "text-[var(--workspace-subtle)] line-through" : ""}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EnergyPanel({ score, message }: { score: number; message: string }) {
  const tone = score >= 80 ? "var(--emerald-neon)" : score >= 60 ? "var(--status-warning)" : "var(--status-danger)";
  return (
    <section className="neu-card p-[var(--card-padding)]">
      <h2 className="mb-4 text-base font-semibold tracking-tight">Coach Energy</h2>
      <div className="flex items-center gap-4">
        <div
          className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${tone} ${score * 3.6}deg, var(--moss-900) 0)` }}
          role="img"
          aria-label={`Energy score ${score} out of 100`}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--workspace-surface)] text-lg font-bold tabular-nums" style={{ color: tone }}>
            {score}
          </div>
        </div>
        <p className="text-sm text-[var(--workspace-muted)]">{message}</p>
      </div>
    </section>
  );
}

type QuickTarget = { sessionId: string; memberName: string } | null;

export function QuickActions({
  occupied,
  nextOpenSession,
  clients,
}: {
  occupied: { dayOfWeek: number; timeSlot: string }[];
  nextOpenSession: QuickTarget;
  clients: { id: string; name: string }[];
}) {
  const [doneOpen, setDoneOpen] = useState(false);
  const tile =
    "neu-card flex min-h-[84px] flex-col justify-center gap-1 p-4 text-left transition hover:bg-[var(--workspace-elevated)] focus-visible:outline-2";
  const title = "text-sm font-bold text-[var(--workspace-text)]";
  const sub = "text-[11px] text-[var(--workspace-muted)]";

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <AddClientButton occupied={occupied} className={tile} autoOpenParam="newClient">
        <span className={title}>Book Client</span>
        <span className={sub}>Add client + weekly rhythm</span>
      </AddClientButton>
      <Link href="/app/calendar" className={tile}>
        <span className={title}>Tap Week</span>
        <span className={sub}>Schedule in one table</span>
      </Link>
      <button type="button" onClick={() => setDoneOpen(true)} className={tile}>
        <span className={title}>Session Done</span>
        <span className={sub}>{nextOpenSession ? `Next: ${nextOpenSession.memberName}` : "10-second completion"}</span>
      </button>
      <Link href="/app/money" className={tile}>
        <span className={title}>Payments</span>
        <span className={sub}>See dues & packages</span>
      </Link>
      {doneOpen && (
        <SessionDoneDialog
          target={nextOpenSession ? { sessionId: nextOpenSession.sessionId, memberName: nextOpenSession.memberName } : null}
          clients={clients}
          onClose={() => setDoneOpen(false)}
        />
      )}
    </div>
  );
}
