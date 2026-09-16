"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function WeightTrendChart({
  data,
}: {
  data: { date: string; weight: number }[];
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-[var(--workspace-muted)]">
        Add at least two weight snapshots to see a trend.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8e9379" }} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#8e9379" }} />
          <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Line type="monotone" dataKey="weight" stroke="#c3f400" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SessionRpeChart({
  data,
}: {
  data: { date: string; rpe: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--workspace-muted)]">No session RPE logged yet.</p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8e9379" }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: "#8e9379" }} />
          <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Line type="monotone" dataKey="rpe" stroke="#00dbe9" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdherenceChart({
  scheduled,
  completed,
}: {
  scheduled: number;
  completed: number;
}) {
  const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--workspace-muted)]">Session adherence</span>
        <span className="font-semibold">{rate}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--workspace-elevated)]">
        <div
          className="h-full rounded-full bg-[var(--workspace-accent)] transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-[var(--workspace-muted)]">
        {completed} of {scheduled} sessions completed
      </p>
    </div>
  );
}
