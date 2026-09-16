import type { ConsultReport } from "@/lib/close-os/analysis";
import { improvementFor } from "@/lib/close-os/analysis";

export type CoachDnaSummary = {
  count: number;
  avg: number;
  clientTalk: number;
  weak: [string, number];
  strong: [string, number];
  weeklyFocus: string;
  recentReports: ConsultReport[];
};

export function computeCoachDnaFromReports(reports: ConsultReport[]): CoachDnaSummary | null {
  if (reports.length === 0) return null;

  const avg = Math.round(reports.reduce((a, r) => a + r.total, 0) / reports.length);
  const clientTalk = Math.round(reports.reduce((a, r) => a + r.st.client, 0) / reports.length);
  const keys = Object.keys(reports[0].scores);
  const avgs: Record<string, number> = {};
  keys.forEach((k) => {
    avgs[k] = Math.round(reports.reduce((a, r) => a + (r.scores[k] ?? 0), 0) / reports.length);
  });
  const sorted = Object.entries(avgs).sort((a, b) => a[1] - b[1]);
  const weak = sorted[0] as [string, number];
  const strong = sorted[sorted.length - 1] as [string, number];

  return {
    count: reports.length,
    avg,
    clientTalk,
    weak,
    strong,
    weeklyFocus: improvementFor(weak[0]),
    recentReports: reports.slice(0, 5),
  };
}
