"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeadActions({ leadId, stage }: { leadId: string; stage: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function convert() {
    if (!confirm("Convert this lead to a client?")) return;
    setLoading(true);
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, convert: true }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/app/clients/${data.member.id}`);
    }
  }

  async function advance(next: string) {
    setLoading(true);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stage: next }),
    });
    setLoading(false);
    router.refresh();
  }

  if (stage === "won") return <span className="text-xs text-emerald-600">Converted</span>;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => advance("consultation")}
        className="text-xs text-[var(--workspace-accent)]"
      >
        Consult
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={convert}
        className="text-xs font-semibold text-emerald-600"
      >
        Convert
      </button>
    </div>
  );
}
