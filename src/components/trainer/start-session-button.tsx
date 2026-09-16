"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function StartSessionButton({
  memberId,
  nextSessionId,
  programmeId,
  label = "Start Session",
  className,
}: {
  memberId: string;
  nextSessionId?: string | null;
  programmeId?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    if (nextSessionId) {
      await fetch(`/api/sessions/${nextSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      router.push(`/app/sessions/${nextSessionId}`);
      router.refresh();
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        programmeId,
        scheduledAt: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    if (res.ok && data.session?.id) {
      await fetch(`/api/sessions/${data.session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      router.push(`/app/sessions/${data.session.id}`);
      router.refresh();
      return;
    }
    setLoading(false);
  }

  return (
    <Button type="button" onClick={start} disabled={loading} className={className}>
      {loading ? "Starting…" : label}
    </Button>
  );
}
