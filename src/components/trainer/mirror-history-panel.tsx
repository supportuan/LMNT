"use client";

import type { MirrorAssessmentRow } from "@/modules/development-queries";

export function MirrorHistoryPanel({
  history,
}: {
  history: MirrorAssessmentRow[];
}) {
  if (history.length === 0) return null;

  const latest = history[0];
  const previous = history[1];

  return (
    <div className="card">
      <h2>Your Mirror history</h2>
      <p className="note">{history.length} assessment{history.length === 1 ? "" : "s"} saved</p>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="box">
          <b>Latest score</b>
          <div className="calc">{latest.overall}/100</div>
          <div className="note">{latest.headline}</div>
          <div className="note">{new Date(latest.createdAt).toLocaleDateString()}</div>
        </div>
        {previous && (
          <div className="box">
            <b>vs previous</b>
            <div className="calc" style={{ color: latest.overall >= previous.overall ? "#059669" : "#dc2626" }}>
              {latest.overall >= previous.overall ? "+" : ""}
              {latest.overall - previous.overall} pts
            </div>
            <div className="note">Previous: {previous.overall} ({previous.headline})</div>
          </div>
        )}
      </div>

      {previous && (
        <div style={{ marginTop: 16 }}>
          <b>Domain changes</b>
          {Object.keys(latest.profileScores).map((domain) => {
            const cur = latest.profileScores[domain] ?? 0;
            const prev = previous.profileScores[domain] ?? 0;
            const diff = cur - prev;
            if (diff === 0) return null;
            return (
              <div key={domain} className="meter">
                <b>
                  {domain}{" "}
                  <span style={{ color: diff > 0 ? "#059669" : "#dc2626" }}>
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </span>
                </b>
                <div className="bar">
                  <i style={{ width: `${cur}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
