"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { buildFourWeekPlan } from "@/lib/coach-pro/engine";

export function ProgramBuilderActions({
  memberId,
  programmeId,
  status,
}: {
  memberId: string;
  programmeId?: string;
  status?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function buildAndSave() {
    setLoading(true);
    const weeks = buildFourWeekPlan(4, "muscle");
    const res = await fetch("/api/programmes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        title: "4-Week Strength Block",
        content: { weeks, goal: "muscle", daysPerWeek: 4 },
        status: "draft",
      }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  async function publish() {
    if (!programmeId) return;
    setLoading(true);
    await fetch("/api/programmes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: programmeId, publish: true }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!programmeId && (
        <Button type="button" size="sm" onClick={buildAndSave} disabled={loading}>
          {loading ? "Building..." : "Build 4-week program"}
        </Button>
      )}
      {programmeId && status === "draft" && (
        <Button type="button" size="sm" onClick={publish} disabled={loading}>
          {loading ? "Publishing..." : "Publish to client"}
        </Button>
      )}
    </div>
  );
}
