"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";

export function NonNegotiablesPanel({
  items,
}: {
  items: { label: string; done: boolean }[];
}) {
  const [local, setLocal] = useState(items);
  const [saving, setSaving] = useState(false);

  const checklist = local.length > 0 ? local : [
    { label: "Own training done", done: false },
    { label: "Meals on plan", done: false },
    { label: "Sleep 7+ hours", done: false },
  ];

  async function toggle(index: number) {
    const next = checklist.map((n, i) => (i === index ? { ...n, done: !n.done } : n));
    setLocal(next);
    setSaving(true);
    await fetch("/api/trainer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonNegotiables: next }),
    });
    setSaving(false);
  }

  return (
    <Panel title="Non-negotiables today">
      <div className="space-y-2">
        {checklist.map((item, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(i)}
              disabled={saving}
            />
            <span className={item.done ? "text-[var(--workspace-muted)] line-through" : ""}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </Panel>
  );
}
