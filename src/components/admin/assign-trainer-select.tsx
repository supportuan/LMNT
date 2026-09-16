"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssignTrainerSelect({
  memberId,
  trainerId,
  trainers,
}: {
  memberId: string;
  trainerId: string | null;
  trainers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(trainerId ?? "");
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setSaving(true);
    await fetch("/api/coaching-relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, trainerId: next || null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => void onChange(e.target.value)}
      className="neu-input max-w-[160px] py-1 text-xs"
    >
      <option value="">Unassigned</option>
      {trainers.map((trainer) => (
        <option key={trainer.id} value={trainer.id}>
          {trainer.name}
        </option>
      ))}
    </select>
  );
}
