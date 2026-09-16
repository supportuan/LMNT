"use client";

import { useState } from "react";
import { Button, Panel } from "@/components/ui";

export function AttendanceCheckInPanel() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function checkIn() {
    setLoading(true);
    const res = await fetch("/api/attendance/check-in", { method: "POST" });
    setLoading(false);
    if (res.ok) setDone(true);
  }

  return (
    <Panel title="Today's check-in">
      {done ? (
        <p className="text-sm text-emerald-600">Checked in successfully.</p>
      ) : (
        <Button type="button" onClick={checkIn} disabled={loading}>
          {loading ? "Checking in..." : "Check in now"}
        </Button>
      )}
    </Panel>
  );
}
