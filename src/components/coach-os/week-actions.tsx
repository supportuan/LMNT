"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { sendJson } from "@/lib/send-json";

export function ProtectLifeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const res = await sendJson<{ created: number; skipped: number }>("/api/trainer/protect-life", "POST");
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    const { created, skipped } = res.data;
    setMessage(
      created > 0
        ? `Protected ${created} block${created === 1 ? "" : "s"}${skipped ? ` · ${skipped} slot(s) already taken` : ""}.`
        : skipped
          ? `No free slots — ${skipped} already taken. Adjust your boundaries in Me.`
          : "Your life blocks are already protected.",
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span role="status" className="hidden text-xs text-[var(--workspace-muted)] sm:inline">
          {message}
        </span>
      )}
      <Button type="button" variant="secondary" onClick={run} disabled={busy}>
        {busy ? "Protecting…" : "Auto Protect My Life"}
      </Button>
    </div>
  );
}

export function BookBanner({ name }: { name: string }) {
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--emerald-neon-tint)] px-4 py-3 text-sm ring-1 ring-inset ring-[var(--emerald-neon)]/30"
    >
      <span>
        Booking <strong className="text-[var(--emerald-neon)]">{name}</strong> — tap a free slot to add them to your weekly rhythm.
      </span>
      <Link href="/app/calendar" className="text-xs font-semibold text-[var(--workspace-muted)] hover:text-[var(--workspace-text)]">
        Cancel
      </Link>
    </div>
  );
}
