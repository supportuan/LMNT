"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function CoachNotesEditor({
  memberId,
  initialNotes,
}: {
  memberId: string;
  initialNotes: { id: string; body: string; updatedAt: Date }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialNotes[0]?.body ?? "");
  const [noteId] = useState(initialNotes[0]?.id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/members/${memberId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, id: noteId }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-md border border-[var(--workspace-border)] p-3 text-sm"
        rows={8}
        placeholder="Coach notes, observations, next actions..."
      />
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || !body.trim()}>
          {saving ? "Saving..." : "Save notes"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </div>
  );
}
