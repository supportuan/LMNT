"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function SessionDoneButton({
  sessionId,
  memberName,
}: {
  sessionId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState("");
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    const res = await fetch("/api/sessions/quick-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        notes: notes || undefined,
        rpe: rpe ? Number(rpe) : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Done
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold">Session done — {memberName}</h3>
        <div className="mt-3 space-y-2">
          <input
            type="number"
            min={1}
            max={10}
            placeholder="RPE (1–10)"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Quick notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={complete} disabled={loading}>
            {loading ? "Saving…" : "Mark complete"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
