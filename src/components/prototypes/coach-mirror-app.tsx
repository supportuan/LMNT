"use client";

import { useMemo, useState } from "react";
import "@/styles/prototypes/coach-mirror.css";
import { computeMirrorResult, type MirrorResult } from "@/lib/coach-mirror/scoring";
import { newCoachingDay, type ProfileInput, type Scenario } from "@/lib/coach-mirror/scenarios";
import { MirrorHistoryPanel } from "@/components/trainer/mirror-history-panel";
import type { MirrorAssessmentRow } from "@/modules/development-queries";

type Phase = "profile" | "game" | "result";

const defaultProfile: ProfileInput = {
  role: "Commercial gym PT",
  exp: 2,
  cert: 2,
  cpr: 1,
  clients: 5,
  clientValue: 8000,
  income: 40000,
  target: 100000,
  timeline: 12,
  hours: 30,
  sessions: 3,
  leads: 8,
  conversions: 2,
  retention: 4,
  checkin: 1,
  fit: 2,
  referrals: 0,
  marketing: 0,
  direction: "Not sure yet",
  niche: "General population",
};

export function CoachMirrorApp({ history = [] }: { history?: MirrorAssessmentRow[] }) {
  const [phase, setPhase] = useState<Phase>("profile");
  const [profile, setProfile] = useState(defaultProfile);
  const [scenes, setScenes] = useState<Scenario[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [result, setResult] = useState<MirrorResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [localHistory, setLocalHistory] = useState(history);

  const current = scenes[idx];

  const canContinue = useMemo(() => {
    const sel = answers[idx] ?? [];
    if (!current) return false;
    if (current.multi) return sel.length === 5;
    return sel.length > 0;
  }, [answers, current, idx]);

  function start() {
    setScenes(newCoachingDay());
    setIdx(0);
    setAnswers([]);
    setResult(null);
    setPhase("game");
  }

  function choose(n: number) {
    if (!current) return;
    setAnswers((prev) => {
      const next = [...prev];
      if (current.multi) {
        let a = [...(next[idx] ?? [])];
        if (a.includes(n)) a = a.filter((x) => x !== n);
        else if (a.length < 5) a.push(n);
        next[idx] = a;
      } else {
        next[idx] = [n];
      }
      return next;
    });
  }

  function advance() {
    if (idx < scenes.length - 1) setIdx((i) => i + 1);
    else {
      const computed = computeMirrorResult(scenes, answers, profile);
      setResult(computed);
      setPhase("result");
      setSaved(false);
      saveResult(computed);
    }
  }

  async function saveResult(computed: MirrorResult) {
    const res = await fetch("/api/coach-mirror", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileInput: profile,
        profileScores: computed.profileScores,
        overall: computed.overall,
        headline: computed.headline,
        weakDomain: computed.weak,
        pathway: computed.pathway,
        checklist: computed.checklist,
        incomeSnapshot: computed.income,
      }),
    });
    if (res.ok) {
      setSaved(true);
      const data = await res.json();
      const row = data.assessment;
      if (row) {
        setLocalHistory((prev) => [
          {
            id: row.id,
            overall: row.overall,
            headline: row.headline,
            weakDomain: row.weakDomain,
            profileScores: row.profileScores,
            createdAt: new Date(row.createdAt),
          },
          ...prev,
        ]);
      }
    }
  }

  function retake() {
    start();
  }

  return (
    <div className="coachMirror">
      <div className="wrap">
        <section className="hero">
          <small>LMNT · THE COACH MAKER</small>
          <h1>Coach Mirror</h1>
        </section>

        {phase === "profile" && (
          <>
            {localHistory.length > 0 && <MirrorHistoryPanel history={localHistory} />}
            <section className="card">
            <div className="call warn">
              <b>SELF-EXAMINATION DISCLAIMER</b>
              <br />
              Answer with high consciousness — what you genuinely do today, not what sounds ideal.
            </div>
            <h2>Your current reality</h2>
            <div className="grid2">
              <div>
                <label>Current active PT clients</label>
                <input
                  type="number"
                  min={0}
                  value={profile.clients}
                  onChange={(e) => setProfile({ ...profile, clients: +e.target.value })}
                />
              </div>
              <div>
                <label>Average monthly revenue per client (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={profile.clientValue}
                  onChange={(e) => setProfile({ ...profile, clientValue: +e.target.value })}
                />
              </div>
              <div>
                <label>Current total monthly fitness income (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={profile.income}
                  onChange={(e) => setProfile({ ...profile, income: +e.target.value })}
                />
              </div>
              <div>
                <label>Your income goal per month (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={profile.target}
                  onChange={(e) => setProfile({ ...profile, target: +e.target.value })}
                />
              </div>
              <div>
                <label>Hours/week you can realistically coach</label>
                <input
                  type="number"
                  min={1}
                  value={profile.hours}
                  onChange={(e) => setProfile({ ...profile, hours: +e.target.value })}
                />
              </div>
              <div>
                <label>Average new leads/month</label>
                <input
                  type="number"
                  min={0}
                  value={profile.leads}
                  onChange={(e) => setProfile({ ...profile, leads: +e.target.value })}
                />
              </div>
              <div>
                <label>Leads that become clients</label>
                <input
                  type="number"
                  min={0}
                  value={profile.conversions}
                  onChange={(e) => setProfile({ ...profile, conversions: +e.target.value })}
                />
              </div>
              <div>
                <label>Preferred career direction</label>
                <select
                  value={profile.direction}
                  onChange={(e) => setProfile({ ...profile, direction: e.target.value })}
                >
                  <option>Not sure yet</option>
                  <option>High-performing commercial gym PT</option>
                  <option>Independent freelance PT</option>
                  <option>Premium specialist coach</option>
                  <option>Online / hybrid coach</option>
                </select>
              </div>
            </div>
            <div style={{ height: 15 }} />
            <button type="button" className="btn" onClick={start}>
              Enter coaching day →
            </button>
          </section>
          </>
        )}

        {phase === "game" && current && (
          <section className="card">
            <div className="row">
              <b>{current.time}</b>
              <span className="note">
                Client {idx + 1} of {scenes.length}
              </span>
            </div>
            <div className="day">
              {scenes.map((s, n) => (
                <div key={n} className={`slot ${n === idx ? "on" : ""}`}>
                  {s.time.split(" · ")[0]}
                  <br />
                  {s.name}
                </div>
              ))}
            </div>
            <div className="client">
              <h2>{current.name}</h2>
              {current.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
              <p>{current.say}</p>
            </div>
            <div className="prompt">{current.q}</div>
            <div className="choices">
              {current.options.map((o, n) => {
                const sel = answers[idx] ?? [];
                const pos = sel.indexOf(n);
                return (
                  <button
                    key={n}
                    type="button"
                    className={`choice ${pos >= 0 ? "sel" : ""}`}
                    onClick={() => choose(n)}
                  >
                    {o[0]}
                    {current.multi && pos >= 0 && <span className="num">{pos + 1}</span>}
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 20 }}>
              <button type="button" className="btn alt" onClick={() => idx > 0 && setIdx(idx - 1)}>
                ← Back
              </button>
              <button type="button" className="btn" onClick={advance} disabled={!canContinue}>
                Continue →
              </button>
            </div>
          </section>
        )}

        {phase === "result" && result && (
          <>
            <div className="card">
              <small className="note">YOUR CURRENT COACHING MIRROR</small>
              <div className="big">{result.headline}</div>
              <p>Your report reflects both your professional reality and the coaching decisions you made today.</p>
              <div className="spectrum">
                <div className="dot" style={{ left: `${Math.max(7, Math.min(93, result.overall))}%` }} />
              </div>
              <div className="row">
                <b>FOUNDATION PT</b>
                <b>COACHING PT</b>
                <b>OUTCOME-DRIVEN PT</b>
              </div>
            </div>
            <div className="card">
              <h2>Your PT profile</h2>
              {Object.entries(result.profileScores).map(([k, v]) => (
                <div key={k} className="meter">
                  <b>{k}</b>
                  <div className="bar">
                    <i style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <h2>Income opportunity</h2>
              <div className="grid4">
                <div className="box">
                  <b>Current income</b>
                  <div className="calc">{result.income.curIncome}</div>
                </div>
                <div className="box">
                  <b>Current PT client revenue</b>
                  <div className="calc">{result.income.curPT}</div>
                </div>
                <div className="box">
                  <b>Goal</b>
                  <div className="calc">{result.income.goalIncome}</div>
                </div>
                <div className="box">
                  <b>Probable with this plan</b>
                  <div className="calc">{result.income.potential}</div>
                </div>
              </div>
              <div className="call" dangerouslySetInnerHTML={{ __html: result.income.planHtml }} />
            </div>
            <div className="card">
              <h2>Your probable career pathway</h2>
              {result.pathway.map(([title, body], i) => (
                <div key={i} className="step">
                  <div className="stepnum">{i + 1}</div>
                  <div>
                    <b>{title}</b>
                    <br />
                    {body}
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <h2>Start today</h2>
              <div className="checklist">
                {result.checklist.map((x, i) => (
                  <div key={i} className="check">
                    <span>☐</span>
                    <span>{x}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="row">
                <button type="button" className="btn" onClick={() => window.print()}>
                  {saved ? "Print report" : "Save report"}
                </button>
                <button type="button" className="btn alt" onClick={retake}>
                  Retake with new situations
                </button>
              </div>
              {saved && <p className="note" style={{ marginTop: 8 }}>Saved to your development history.</p>}
            </div>
            {localHistory.length > 1 && <MirrorHistoryPanel history={localHistory} />}
          </>
        )}

        <footer>Coach Mirror · LMNT — The Coach Maker</footer>
      </div>
    </div>
  );
}
