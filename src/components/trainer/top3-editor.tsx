"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Top3Editor({ initialTop3 }: { initialTop3: string[] }) {
  const router = useRouter();
  const [items, setItems] = useState(() =>
    [0, 1, 2].map((i) => initialTop3[i] ?? ""),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/trainer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ top3: items.filter(Boolean) }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <input
          key={i}
          className="w-full rounded-md border border-[var(--workspace-border)] px-3 py-2 text-sm"
          placeholder={`Priority ${i + 1}`}
          value={item}
          onChange={(e) => {
            const next = [...items];
            next[i] = e.target.value;
            setItems(next);
          }}
          onBlur={save}
        />
      ))}
      {saving && <p className="text-xs text-[var(--workspace-muted)]">Saving…</p>}
    </div>
  );
}
