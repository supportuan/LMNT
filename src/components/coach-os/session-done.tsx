"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, Field } from "@/components/dialog";
import { Button } from "@/components/ui";
import { sendJson } from "@/lib/send-json";

type Target = { sessionId?: string; memberId?: string; memberName?: string };

const PERFORMANCE = ["Good", "Great", "Average", "Regressed"] as const;
const ENERGY = ["Good", "Excellent", "Okay", "Low"] as const;

export function SessionDoneDialog({
  target,
  clients = [],
  onClose,
  onDone,
}: {
  target: Target | null;
  clients?: { id: string; name: string }[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(target?.memberId ?? "");
  const [performance, setPerformance] = useState<(typeof PERFORMANCE)[number]>("Good");
  const [energy, setEnergy] = useState<(typeof ENERGY)[number]>("Good");
  const [rpe, setRpe] = useState(7);
  const [pain, setPain] = useState("");
  const [nextNote, setNextNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsPicker = !target?.sessionId && !target?.memberId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needsPicker && !memberId) {
      setError("Choose the client you just trained.");
      return;
    }
    if (pain.trim() && pain.trim().length < 10 && !/^(none|no)$/i.test(pain.trim())) {
      setError("Describe the pain or issue in a little more detail (10+ characters).");
      return;
    }
    setSaving(true);
    setError("");
    const res = await sendJson("/api/coach-os/session-done", "POST", {
      sessionId: target?.sessionId,
      memberId: target?.sessionId ? undefined : target?.memberId ?? memberId,
      performance,
      energy,
      rpe,
      pain: pain.trim() || undefined,
      nextNote: nextNote.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    onDone?.();
    router.refresh();
  }

  return (
    <Dialog
      title={target?.memberName ? `Session done · ${target.memberName}` : "Session done"}
      description="10-second wrap-up. Deducts one session from the package."
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        {needsPicker && (
          <Field label="Client">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="neu-input" required>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Performance">
            <select
              value={performance}
              onChange={(e) => setPerformance(e.target.value as (typeof PERFORMANCE)[number])}
              className="neu-input"
            >
              {PERFORMANCE.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Client energy">
            <select value={energy} onChange={(e) => setEnergy(e.target.value as (typeof ENERGY)[number])} className="neu-input">
              {ENERGY.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`Session RPE · ${rpe}/10`} hint="How hard the session felt (rate of perceived exertion).">
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full accent-[var(--emerald-neon)]"
          />
        </Field>
        <Field label="Pain / issue?">
          <input value={pain} onChange={(e) => setPain(e.target.value)} placeholder="None" className="neu-input" maxLength={500} />
        </Field>
        <Field label="Next-session note">
          <input
            value={nextNote}
            onChange={(e) => setNextNote(e.target.value)}
            placeholder="What should I remember next time?"
            className="neu-input"
            maxLength={1000}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-[var(--status-danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Done"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SessionDoneButton({
  sessionId,
  memberId,
  memberName,
  clients,
  label = "Done",
  variant = "secondary",
  size = "sm",
  className = "",
}: {
  sessionId?: string;
  memberId?: string;
  memberName?: string;
  clients?: { id: string; name: string }[];
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <SessionDoneDialog
          target={sessionId || memberId ? { sessionId, memberId, memberName } : null}
          clients={clients}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
