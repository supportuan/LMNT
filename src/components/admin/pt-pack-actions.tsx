"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function PtPackActions({ planId, status }: { planId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(action: "pause" | "resume") {
    setLoading(true);
    await fetch("/api/pt-packs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, action }),
    });
    setLoading(false);
    router.refresh();
  }

  if (status === "expired" || status === "cancelled") return null;

  return (
    <div className="flex gap-2">
      {status === "active" ? (
        <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => void run("pause")}>
          Pause
        </Button>
      ) : status === "paused" ? (
        <Button type="button" size="sm" disabled={loading} onClick={() => void run("resume")}>
          Resume
        </Button>
      ) : null}
    </div>
  );
}