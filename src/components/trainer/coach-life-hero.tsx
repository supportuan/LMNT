import Link from "next/link";
import { Button } from "@/components/ui";

type Alert = { message: string; tone: "warning" | "danger" | "info"; href?: string };

export function CoachLifeHero({
  nextClient,
  weekSessions,
  todaySessions,
  followUps,
  loadHours,
}: {
  nextClient: { name: string; time: string; day: string; sessionId: string; memberId: string } | null;
  weekSessions: number;
  todaySessions: number;
  followUps: number;
  loadHours: number;
}) {
  const stats = [
    { label: "sessions today", value: String(todaySessions), highlight: true },
    { label: "sessions this week", value: String(weekSessions) },
    { label: "follow-ups", value: String(followUps), href: "/app/clients?filter=follow-up" },
    { label: "coaching load", value: `${loadHours}h` },
  ];

  return (
    <section
      aria-label="Next client"
      className="relative mb-4 grid gap-5 overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[var(--moss-900)] via-[var(--jet-900)] to-[var(--jet-950)] p-6 shadow-[var(--neu-shadow-raised)] lg:grid-cols-[1.25fr_0.75fr]"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--emerald-neon)] via-[var(--emerald-neon)]/40 to-transparent" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--emerald-neon)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald-neon)] shadow-[0_0_8px_var(--emerald-neon)]" />
          Next client
        </div>
        {nextClient ? (
          <>
            <h2 className="mt-2 truncate text-3xl font-bold tracking-tight">{nextClient.name}</h2>
            <p className="mt-1 text-sm text-[var(--workspace-muted)]">
              {nextClient.time} · {nextClient.day}
            </p>
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
            <h2 className="mt-2 text-3xl font-bold tracking-tight">No client booked</h2>
            <p className="mt-1 text-sm text-[var(--workspace-muted)]">Protect the day before requests fill it.</p>
            <div className="mt-4">
              <Button href="/app/calendar" size="sm">
                Open Week
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => {
          const body = (
            <>
              <span className={`text-2xl font-bold tabular-nums ${s.highlight ? "text-[var(--emerald-neon)]" : ""}`}>{s.value}</span>
              <span className="text-[11px] text-[var(--workspace-muted)]">{s.label}</span>
            </>
          );
          const cls =
            "flex flex-col rounded-[var(--radius-control)] bg-[var(--moss-tint)] px-4 py-3 ring-1 ring-inset ring-[var(--moss-800)]";
          return s.href ? (
            <Link key={s.label} href={s.href} className={`${cls} transition hover:ring-[var(--moss-700)]`}>
              {body}
            </Link>
          ) : (
            <div key={s.label} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CoachAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  const border = {
    danger: "border-l-[var(--status-danger)]",
    warning: "border-l-[var(--status-warning)]",
    info: "border-l-[var(--moss-500)]",
  };
  return (
    <ul className="mb-6 space-y-2" aria-label="Alerts">
      {alerts.map((a, i) => (
        <li key={i} className={`neu-card rounded-[12px] border-l-4 px-4 py-3 text-sm ${border[a.tone]}`}>
          {a.href ? (
            <Link href={a.href} className="flex items-center justify-between gap-3 hover:text-[var(--emerald-neon)]">
              <span>{a.message}</span>
              <span aria-hidden className="text-[var(--workspace-subtle)]">→</span>
            </Link>
          ) : (
            a.message
          )}
        </li>
      ))}
    </ul>
  );
}
