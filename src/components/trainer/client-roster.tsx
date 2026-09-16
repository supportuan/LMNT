"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import type { TrainerClientCard } from "@/modules/trainer-queries";

function progressLabel(c: TrainerClientCard) {
  if (c.progressStatus === "at_risk") return "At risk";
  if (c.progressStatus === "needs_review") return "Needs review";
  return "On track";
}

export function ClientRoster({
  clients,
  initialFilter,
}: {
  clients: TrainerClientCard[];
  initialFilter?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter === "inactive" ? "inactive" : "active");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const isActive = c.status === "active";
      if (filter === "active" && !isActive) return false;
      if (filter === "inactive" && isActive) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.goal ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, filter, query]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients"
          className="w-full max-w-sm rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--workspace-accent)]"
        />
        <div className="flex gap-2">
          {(["active", "inactive"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${
                filter === value
                  ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-text,#161e00)]"
                  : "border border-[var(--workspace-border)] text-[var(--workspace-muted)]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--workspace-border)] px-4 py-10 text-center text-sm text-[var(--workspace-muted)]">
          No clients match this search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/app/clients/${c.id}`}
              className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 transition hover:border-[var(--workspace-accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{c.name}</div>
                  <div className="mt-1 text-sm text-[var(--workspace-accent)]">
                    {c.goal ?? "Goal not set"}
                  </div>
                </div>
                <Badge
                  tone={
                    c.progressStatus === "at_risk"
                      ? "danger"
                      : c.progressStatus === "needs_review"
                        ? "warning"
                        : "success"
                  }
                >
                  {progressLabel(c)}
                </Badge>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--workspace-muted)]">Next session</dt>
                  <dd className="font-medium">
                    {c.nextSession
                      ? new Date(c.nextSession).toLocaleString(undefined, {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not scheduled"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--workspace-muted)]">Progress</dt>
                  <dd className="font-medium">{progressLabel(c)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
