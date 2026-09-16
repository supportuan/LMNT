"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ScoredTrainer } from "@/modules/coach-match-queries";
import "@/styles/prototypes/coach-match.css";

export type MarketplaceTrainer = ScoredTrainer;

type MeetingType = "consultation" | "trial" | "coffee";

const MEETING_LABELS: Record<MeetingType, string> = {
  consultation: "Free consult",
  trial: "Trial session",
  coffee: "Coffee chat",
};

export function CoachMatchApp({
  trainers,
  memberGoal,
}: {
  trainers: MarketplaceTrainer[];
  memberGoal: string | null;
}) {
  const router = useRouter();
  const [centre, setCentre] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "saved">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ name: string; meetingType: MeetingType } | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<Record<string, MeetingType>>({});

  const centres = useMemo(
    () => [...new Set(trainers.map((t) => t.centreName))].sort(),
    [trainers],
  );

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      if (view === "saved" && t.interactionStatus !== "saved") return false;
      if (centre && t.centreName !== centre) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.specialties.some((s) => s.toLowerCase().includes(q)) ||
        t.centreName.toLowerCase().includes(q)
      );
    });
  }, [trainers, centre, query, view]);

  function meetingTypeFor(trainerId: string): MeetingType {
    return meetingTypes[trainerId] ?? "consultation";
  }

  async function setInteraction(trainer: MarketplaceTrainer, status: "saved" | "passed") {
    setLoading(`${status}-${trainer.id}`);
    const res = await fetch("/api/coach-match/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerId: trainer.id,
        centreId: trainer.centreId,
        status,
        matchScore: trainer.matchScore,
        matchReasons: trainer.matchReasons,
      }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  async function requestMeeting(trainer: MarketplaceTrainer) {
    const meetingType = meetingTypeFor(trainer.id);
    setLoading(`meet-${trainer.id}`);
    const res = await fetch("/api/coach-match/consult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerId: trainer.id,
        centreId: trainer.centreId,
        trainerName: trainer.name,
        meetingType,
        matchScore: trainer.matchScore,
        matchReasons: trainer.matchReasons,
      }),
    });
    setLoading(null);
    if (res.ok) {
      setConfirmed({ name: trainer.name, meetingType });
      router.refresh();
    }
  }

  return (
    <div className="coachMatch">
      <div className="hero">
        <div className="heroInner">
          <div className="eyebrow">CoachMatch · LMNT</div>
          <h1>Find your coach</h1>
          <p className="lede">
            Coaches ranked by goal fit, branch proximity, capacity, and verified credentials. Save
            favourites or request a consultation, trial, or coffee chat.
          </p>
          {memberGoal && (
            <p className="goalHint">
              Your goal: <strong>{memberGoal}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="filters">
        <div className="viewTabs">
          <button
            type="button"
            className={view === "all" ? "tab active" : "tab"}
            onClick={() => setView("all")}
          >
            All coaches
          </button>
          <button
            type="button"
            className={view === "saved" ? "tab active" : "tab"}
            onClick={() => setView("saved")}
          >
            Saved
          </button>
        </div>
        <select value={centre} onChange={(e) => setCentre(e.target.value)}>
          <option value="">All branches</option>
          {centres.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: fat loss, strength, beginner..."
          style={{ flex: 1, minWidth: 200 }}
        />
      </div>

      <div className="shell">
        {confirmed && (
          <div className="banner success">
            {MEETING_LABELS[confirmed.meetingType]} request sent for {confirmed.name}. Your coach
            will reach out to schedule.
          </div>
        )}
        <div className="grid">
          {filtered.length === 0 ? (
            <div className="empty">
              {view === "saved" ? "No saved coaches yet." : "No coaches match your filters."}
            </div>
          ) : (
            filtered.map((t) => {
              const isRequested = t.interactionStatus === "requested";
              const isMatched = t.interactionStatus === "matched";
              const isPassed = t.interactionStatus === "passed";
              const isSaved = t.interactionStatus === "saved";
              const meetingType = meetingTypeFor(t.id);

              return (
                <article
                  key={t.id}
                  className={`card${isPassed ? " cardPassed" : ""}${isSaved ? " cardSaved" : ""}`}
                >
                  <div className="avatar">
                    <span>{t.name.slice(0, 2).toUpperCase()}</span>
                    <div className="scoreBadge">{t.matchScore}%</div>
                  </div>
                  <div className="body">
                    <div className="nameRow">
                      <div className="name">{t.name}</div>
                      {t.verified && <span className="verifiedBadge">Verified</span>}
                    </div>
                    <div className="centre">{t.centreName}</div>
                    <div className="tags">
                      {t.specialties.map((s) => (
                        <span key={s} className="tag">
                          {s}
                        </span>
                      ))}
                    </div>
                    <ul className="reasons">
                      {t.matchReasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <div className="meta">{t.bio}</div>
                    <div className="meta load">Typical load: {t.sessionsPerWeek}</div>

                    {isMatched ? (
                      <div className="statusPill matched">Matched</div>
                    ) : isRequested ? (
                      <div className="statusPill requested">
                        {t.meetingType ? `${MEETING_LABELS[t.meetingType as MeetingType]} requested` : "Meeting requested"}
                      </div>
                    ) : (
                      <>
                        <select
                          className="meetingSelect"
                          value={meetingType}
                          onChange={(e) =>
                            setMeetingTypes((prev) => ({
                              ...prev,
                              [t.id]: e.target.value as MeetingType,
                            }))
                          }
                        >
                          <option value="consultation">Free consultation</option>
                          <option value="trial">Trial session</option>
                          <option value="coffee">Coffee chat</option>
                        </select>
                        <div className="actions">
                          <button
                            type="button"
                            className="btnSecondary"
                            disabled={loading === `saved-${t.id}`}
                            onClick={() => setInteraction(t, "saved")}
                          >
                            {isSaved ? "Saved" : loading === `saved-${t.id}` ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btnSecondary muted"
                            disabled={loading === `passed-${t.id}`}
                            onClick={() => setInteraction(t, "passed")}
                          >
                            {loading === `passed-${t.id}` ? "…" : "Pass"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            disabled={loading === `meet-${t.id}`}
                            onClick={() => requestMeeting(t)}
                          >
                            {loading === `meet-${t.id}`
                              ? "Sending…"
                              : `Request ${MEETING_LABELS[meetingType].toLowerCase()}`}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
