"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";

type Session = {
  id: string;
  scheduledAt: string;
  status: string;
};

export function ClientSchedulePanel({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function requestReschedule(sessionId: string) {
    setRequesting(sessionId);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: `Hi coach — I'd like to reschedule my session on ${new Date(sessions.find((s) => s.id === sessionId)!.scheduledAt).toLocaleString()}. Please let me know available times.`,
      }),
    });
    setRequesting(null);
    setSent(sessionId);
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Schedule" description="Your upcoming coaching sessions." />
      <Panel title="Upcoming">
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--workspace-muted)]">No sessions scheduled.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--workspace-border)] px-4 py-3"
              >
                <div>
                  <span>{new Date(s.scheduledAt).toLocaleString()}</span>
                  <span className="ml-2 capitalize text-[var(--workspace-muted)]">{s.status}</span>
                </div>
                {s.status === "scheduled" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={requesting === s.id}
                    onClick={() => requestReschedule(s.id)}
                  >
                    {sent === s.id ? "Request sent" : requesting === s.id ? "Sending…" : "Request reschedule"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
