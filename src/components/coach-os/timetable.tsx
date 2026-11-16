"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DayPicker, Dialog, Field } from "@/components/dialog";
import { Button } from "@/components/ui";
import {
  BLOCK_STYLES,
  BLOCK_TYPES,
  COMPACT_SLOTS,
  DAY_SHORT,
  TIME_SLOTS,
  WEEK_DAYS,
  slotStartHour,
  type BlockType,
} from "@/lib/coach-life/timetable";
import { sendJson } from "@/lib/send-json";

export type TimetableBlock = {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  blockType: BlockType;
  label: string;
  memberId: string | null;
};

export type TimetableClient = { id: string; name: string };

type Editing = { dayOfWeek: number; timeSlot: string; block: TimetableBlock | null };

export function Timetable({
  blocks,
  clients,
  compact = false,
  bookMemberId,
}: {
  blocks: TimetableBlock[];
  clients: TimetableClient[];
  compact?: boolean;
  bookMemberId?: string | null;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, TimetableBlock>();
    for (const b of blocks) map.set(`${b.dayOfWeek}|${b.timeSlot}`, b);
    return map;
  }, [blocks]);

  const rows: readonly string[] = compact ? COMPACT_SLOTS : TIME_SLOTS;
  const extraSlots = compact
    ? []
    : [...new Set(blocks.map((b) => b.timeSlot))].filter((s) => !TIME_SLOTS.includes(s as (typeof TIME_SLOTS)[number]));
  const allRows = [...rows, ...extraSlots];

  const todayDow = now?.getDay() ?? -1;
  const currentHour = now?.getHours() ?? -1;

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-control)] ring-1 ring-inset ring-[var(--workspace-border)]">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <caption className="sr-only">Weekly timetable. Select a cell to schedule a block.</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[76px] bg-[var(--jet-850)] px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-subtle)]">
                Time
              </th>
              {WEEK_DAYS.map((d) => (
                <th
                  key={d.dow}
                  scope="col"
                  className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.12em] ${
                    d.dow === todayDow
                      ? "bg-[var(--emerald-neon-tint)] text-[var(--emerald-neon)] shadow-[inset_0_-2px_0_var(--emerald-neon)]"
                      : "bg-[var(--jet-850)] text-[var(--workspace-muted)]"
                  }`}
                >
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((slot) => {
              const isNowRow = slotStartHour(slot) === currentHour;
              return (
                <tr key={slot} className="border-t border-[var(--workspace-border)]">
                  <th
                    scope="row"
                    className={`whitespace-nowrap px-2 py-1 text-[11px] font-semibold tabular-nums ${
                      isNowRow ? "text-[var(--emerald-neon)]" : "text-[var(--workspace-subtle)]"
                    }`}
                  >
                    {slot}
                  </th>
                  {WEEK_DAYS.map((d) => {
                    const block = byKey.get(`${d.dow}|${slot}`) ?? null;
                    const isToday = d.dow === todayDow;
                    return (
                      <td
                        key={d.dow}
                        className={`h-12 border-l border-[var(--workspace-border)] p-1 align-top ${
                          isToday ? "bg-[var(--emerald-neon)]/[0.03]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditing({ dayOfWeek: d.dow, timeSlot: slot, block })}
                          aria-label={`${DAY_SHORT[d.dow]} ${slot}: ${block ? block.label : "empty, add block"}`}
                          className={`group flex h-full min-h-10 w-full items-start rounded-[8px] px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition ${
                            block
                              ? `${BLOCK_STYLES[block.blockType]} hover:brightness-125`
                              : "text-transparent hover:bg-[var(--moss-tint)] hover:text-[var(--workspace-subtle)]"
                          }`}
                        >
                          <span className="line-clamp-2">{block ? block.label : "+ Add"}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Legend />

      {editing && (
        <SlotDialog
          key={`${editing.dayOfWeek}|${editing.timeSlot}`}
          editing={editing}
          clients={clients}
          bookMemberId={bookMemberId}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--workspace-muted)]">
      {BLOCK_TYPES.map((t) => (
        <li key={t.value} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${BLOCK_STYLES[t.value]}`} aria-hidden />
          {t.label}
        </li>
      ))}
    </ul>
  );
}

function SlotDialog({
  editing,
  clients,
  bookMemberId,
  onClose,
}: {
  editing: Editing;
  clients: TimetableClient[];
  bookMemberId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const existing = editing.block;
  const [type, setType] = useState<BlockType>(existing?.blockType ?? "client");
  const [memberId, setMemberId] = useState(existing?.memberId ?? bookMemberId ?? "");
  const [label, setLabel] = useState(existing && existing.blockType !== "client" ? existing.label : "");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isClient = type === "client";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (isClient && !memberId) {
      setError("Choose a client for this slot.");
      return;
    }
    setSaving(true);
    setError("");
    const clientName = clients.find((c) => c.id === memberId)?.name;
    const res = await sendJson("/api/schedule-blocks", "POST", {
      dayOfWeek: editing.dayOfWeek,
      timeSlot: editing.timeSlot,
      blockType: type,
      label: isClient ? clientName : label.trim() || undefined,
      memberId: isClient ? memberId : null,
      repeatDays: isClient ? repeatDays.filter((d) => d !== editing.dayOfWeek) : [],
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!existing) return;
    setSaving(true);
    const res = await sendJson(`/api/schedule-blocks?id=${existing.id}`, "DELETE");
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      title={`${DAY_SHORT[editing.dayOfWeek]} · ${editing.timeSlot}`}
      description={existing ? "Edit or clear this block." : "Schedule a block in this slot."}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="What is this?">
          <select value={type} onChange={(e) => setType(e.target.value as BlockType)} className="neu-input">
            {BLOCK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {isClient ? (
          <Field label="Client" hint={clients.length === 0 ? "Add a client first from Clients." : undefined}>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="neu-input" required>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Label" hint="Leave blank to use the default name.">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={BLOCK_TYPES.find((t) => t.value === type)?.defaultLabel}
              className="neu-input"
              maxLength={80}
            />
          </Field>
        )}

        {isClient && (
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
              Repeat this client on
            </span>
            <DayPicker value={repeatDays} onChange={setRepeatDays} label="Repeat days" />
            <p className="mt-1.5 text-[11px] text-[var(--workspace-subtle)]">
              Same time, every week. Sessions are booked for the next 2 weeks automatically.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-[var(--status-danger)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {existing && (
            <Button type="button" variant="ghost" onClick={remove} disabled={saving} className="mr-auto text-[var(--status-danger)]">
              Remove
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
