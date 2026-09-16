"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ProfileGoalForm({ initialGoal }: { initialGoal: string | null }) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/client/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <label className="text-sm">
        <span className="text-[var(--workspace-muted)]">Update your goal</span>
        <input
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border px-3 py-2"
          placeholder="e.g. Lose 5kg, build strength..."
        />
      </label>
      <Button type="button" size="sm" className="mt-2" onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved" : "Save goal"}
      </Button>
    </div>
  );
}
