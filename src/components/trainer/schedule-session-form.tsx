"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/calendar-utils";

const inputClass =
  "w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

function defaultDatetime() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

export function ScheduleSessionForm({
  memberId,
  memberName,
  programmeId,
}: {
  memberId: string;
  memberName: string;
  programmeId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [datetime, setDatetime] = useState(defaultDatetime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        programmeId,
        scheduledAt: fromDatetimeLocalValue(datetime).toISOString(),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to schedule session");
      return;
    }

    const data = await res.json();
    setOpen(false);
    router.push(`/app/sessions/${data.session.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Schedule session
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Schedule session</h2>
        <p className="mt-1 text-sm text-[var(--workspace-muted)]">Client: {memberName}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Date & time
            <input
              required
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Scheduling..." : "Schedule session"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
