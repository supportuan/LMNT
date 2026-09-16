"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";

export function TrainerMarketplaceForm({
  initialBio,
  initialSpecialties,
  initialSessionsPerWeek,
  initialVisible,
}: {
  initialBio: string;
  initialSpecialties: string[];
  initialSessionsPerWeek: string;
  initialVisible: boolean;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [specialties, setSpecialties] = useState(initialSpecialties.join(", "));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialSessionsPerWeek);
  const [visible, setVisible] = useState(initialVisible);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/trainer-profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        sessionsPerWeek,
        marketplaceVisible: visible,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <Panel title="Marketplace profile" elevated>
      <p className="mb-4 text-sm text-[var(--workspace-muted)]">
        Shown to clients browsing Coach Match — specialties, bio, and typical load.
      </p>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--workspace-muted)]">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--workspace-muted)]">Specialties (comma-separated)</span>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--workspace-muted)]">Typical load</span>
          <input
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="3–5 sessions / week"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Visible on Coach Match
        </label>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save marketplace profile"}
        </Button>
      </div>
    </Panel>
  );
}
