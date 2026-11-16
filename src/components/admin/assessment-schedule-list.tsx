"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, DataTable } from "@/components/ui";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/calendar-utils";
import { formatDate } from "@/lib/format";

export type ScheduledAssessmentRow = {
  id: string;
  memberId: string;
  memberName: string;
  trainerId: string | null;
  trainerName: string | null;
  scheduledAt: Date | string | null;
  status: string;
  notes: string | null;
  goal: string | null;
};

type Trainer = { id: string; name: string };

const inputClass =
  "w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm";

export function AssessmentScheduleList({
  rows,
  trainers,
}: {
  rows: ScheduledAssessmentRow[];
  trainers: Trainer[];
}) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState("");
  const [datetime, setDatetime] = useState("");
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function openEdit(row: ScheduledAssessmentRow) {
    setEditId(row.id);
    setTrainerId(row.trainerId ?? "");
    setDatetime(
      row.scheduledAt
        ? toDatetimeLocalValue(new Date(row.scheduledAt))
        : toDatetimeLocalValue(new Date()),
    );
    setGoals(row.notes ?? row.goal ?? "");
    setMessage("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/assessment-scheduling", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId: editId,
        trainerId: trainerId || undefined,
        scheduledAt: fromDatetimeLocalValue(datetime).toISOString(),
        goals: goals.trim() || undefined,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }
    setMessage(data.output ?? "Updated");
    setEditId(null);
    router.refresh();
  }

  const upcoming = rows.filter((r) => r.scheduledAt && r.status !== "completed");

  return (
    <>
      <DataTable
        headers={["Member", "Trainer", "When", "Goals", "Status", ""]}
        rows={
          upcoming.length === 0
            ? [["—", "No assessments scheduled", "—", "—", "—", ""]]
            : upcoming.map((row) => [
                <Link
                  key={`${row.id}-m`}
                  href={`/app/clients/${row.memberId}/assessment`}
                  className="font-medium hover:text-[var(--workspace-accent)]"
                >
                  {row.memberName}
                </Link>,
                row.trainerName ?? "—",
                row.scheduledAt ? formatDate(row.scheduledAt) : "—",
                <span key={`${row.id}-g`} className="max-w-[200px] truncate block text-sm">
                  {row.notes ?? row.goal ?? "—"}
                </span>,
                row.status,
                <Button key={`${row.id}-btn`} type="button" size="sm" variant="secondary" onClick={() => openEdit(row)}>
                  Reassign / reschedule
                </Button>,
              ])
        }
      />

      {editId && (
        <form
          onSubmit={save}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Reassign or reschedule</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Trainer
                <select
                  required
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className={`${inputClass} mt-1`}
                >
                  <option value="">Select…</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Assessment time
                <input
                  required
                  type="datetime-local"
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="block text-sm font-medium">
                Goals
                <textarea
                  rows={2}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
              {message && <p className="text-sm text-[var(--workspace-muted)]">{message}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}