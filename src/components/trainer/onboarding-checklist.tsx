"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingChecklist({
  assignmentId,
  checklist,
  status,
}: {
  assignmentId: string;
  checklist: { item: string; done: boolean }[];
  status: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(checklist);
  const [saving, setSaving] = useState(false);

  async function toggle(index: number) {
    const next = items.map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    setItems(next);
    setSaving(true);
    const allDone = next.every((i) => i.done);
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        checklist: next,
        status: allDone ? "completed" : "in_progress",
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase text-[var(--workspace-muted)]">Onboarding · {status.replace("_", " ")}</div>
      {items.map((item, i) => (
        <label key={i} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={item.done} onChange={() => toggle(i)} />
          <span className={item.done ? "text-[var(--workspace-muted)] line-through" : ""}>{item.item}</span>
        </label>
      ))}
      {saving && <p className="text-xs text-[var(--workspace-muted)]">Saving…</p>}
    </div>
  );
}
