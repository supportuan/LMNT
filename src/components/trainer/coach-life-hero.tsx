"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";

type Alert = { message: string; tone: "warning" | "danger" | "info" };

export function CoachLifeHero({
  nextClient,
  energyScore,
  alerts,
  weekSessions,
  todaySessions,
  followUps,
}: {
  nextClient: { name: string; time: string; sessionId: string; memberId: string } | null;
  energyScore: number;
  alerts: Alert[];
  weekSessions: number;
  todaySessions: number;
  followUps: number;
}) {
  const energyTone =
    energyScore >= 75 ? "success" : energyScore >= 55 ? "warning" : "danger";

  return (
    <div className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--workspace-border)] bg-gradient-to-br from-[#1e1b4b] to-[#312e81] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[200px] flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-indigo-200">
            Coach Life — Today
          </div>
          {nextClient ? (
            <>
              <div className="mt-2 text-2xl font-bold">Next: {nextClient.name}</div>
              <div className="mt-1 text-sm text-indigo-200">at {nextClient.time}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href={`/app/sessions/${nextClient.sessionId}`} size="sm">
                  Start session
                </Button>
                <Button href={`/app/clients/${nextClient.memberId}`} variant="secondary" size="sm">
                  Open client
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold">No sessions queued</div>
              <div className="mt-1 text-sm text-indigo-200">Schedule time or protect recovery.</div>
              <div className="mt-4">
                <Button href="/app/sessions" variant="secondary" size="sm">
                  View sessions
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur">
            <div className="text-2xl font-bold">{todaySessions}</div>
            <div className="text-xs text-indigo-200">Today</div>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur">
            <div className="text-2xl font-bold">{weekSessions}</div>
            <div className="text-xs text-indigo-200">This week</div>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur">
            <div className="text-2xl font-bold">{followUps}</div>
            <div className="text-xs text-indigo-200">Follow-ups</div>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur">
            <div className="text-2xl font-bold">{energyScore}</div>
            <div className="text-xs text-indigo-200">Energy</div>
            <Badge tone={energyTone}>{energyScore >= 75 ? "Good" : energyScore >= 55 ? "Moderate" : "Low"}</Badge>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                a.tone === "danger"
                  ? "bg-red-500/20 text-red-100"
                  : a.tone === "warning"
                    ? "bg-amber-500/20 text-amber-100"
                    : "bg-white/10 text-indigo-100"
              }`}
            >
              {a.message}
              {a.tone === "info" && (
                <Link href="/app/money" className="ml-2 underline">
                  View money
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
