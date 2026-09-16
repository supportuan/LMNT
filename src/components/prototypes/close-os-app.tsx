"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/prototypes/close-os.css";
import { OBJECTION_LIBRARY } from "@/lib/close-os/objection-library";
import {
  analyseConsultation,
  DEMO_TRANSCRIPT,
  findMoments,
  improvementFor,
  liveAssistRead,
  type ConsultReport,
} from "@/lib/close-os/analysis";
import { computeCoachDnaFromReports } from "@/lib/close-os/coach-dna";

type View = "consult" | "report" | "crm" | "coach" | "library";

export function CloseOsApp({
  leadId,
  initialName = "",
  initialGoal = "",
  initialStage = "",
  initialLeadStage = "",
  initialReports = [],
  embedded = true,
}: {
  leadId?: string;
  initialName?: string;
  initialGoal?: string;
  initialStage?: string;
  initialLeadStage?: string;
  initialReports?: ConsultReport[];
  embedded?: boolean;
} = {}) {
  const [view, setView] = useState<View>("consult");
  const [name, setName] = useState(initialName);
  const [stage, setStage] = useState(initialStage);
  const [goal, setGoal] = useState(initialGoal);
  const [price, setPrice] = useState("");
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micStatus, setMicStatus] = useState(
    "Ready. Chrome/Edge speech recognition supported where available.",
  );
  const [listening, setListening] = useState(false);
  const [timer, setTimer] = useState("00:00");
  const [report, setReport] = useState<ConsultReport | null>(null);
  const [reports, setReports] = useState<ConsultReport[]>(initialReports);
  const [crmId, setCrmId] = useState<string | number | null>(null);
  const [libSearch, setLibSearch] = useState("");
  const [leadStage, setLeadStage] = useState(initialLeadStage);
  const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTranscriptRef = useRef("");
  const finalTextRef = useRef("");
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialReports.length > 0) return;
    fetch("/api/consultation-reports" + (leadId ? `?leadId=${leadId}` : ""))
      .then((r) => r.json())
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
      .catch(() => {});
  }, [leadId, initialReports.length]);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialGoal) setGoal(initialGoal);
    if (initialStage) setStage(initialStage);
    if (initialLeadStage) setLeadStage(initialLeadStage);
  }, [initialName, initialGoal, initialStage, initialLeadStage]);

  const live = useMemo(() => liveAssistRead(transcript), [transcript]);

  const library = useMemo(() => {
    const q = libSearch.toLowerCase();
    return OBJECTION_LIBRARY.filter(
      (o) =>
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.route.toLowerCase().includes(q) ||
        o.types.join(" ").toLowerCase().includes(q),
    );
  }, [libSearch]);

  const coachDna = useMemo(() => computeCoachDnaFromReports(reports), [reports]);

  async function advancePipeline(action: "trial" | "convert" | "lost") {
    if (!leadId) {
      setPipelineMsg("Link this consultation to a lead from the pipeline first.");
      return;
    }
    setPipelineMsg(null);
    const body =
      action === "convert"
        ? { id: leadId, convert: true }
        : { id: leadId, stage: action === "lost" ? "lost" : "trial" };
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setPipelineMsg(data?.error ?? "Could not update pipeline stage.");
      return;
    }
    if (action === "convert") {
      setLeadStage("won");
      setPipelineMsg("Lead converted to client. Onboarding checklist created.");
    } else if (action === "trial") {
      setLeadStage("trial");
      setPipelineMsg("Lead moved to trial.");
    } else {
      setLeadStage("lost");
      setPipelineMsg("Lead marked lost.");
    }
  }

  const stopMic = useCallback(() => {
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setMicStatus("Stopped. You can edit the transcript before analysis.");
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicStatus("Live browser speech recognition is not supported here. Paste/type the transcript instead.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    recognitionRef.current = rec;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTextRef.current += `${txt.trim()}\n`;
        else interim += txt;
      }
      setTranscript(baseTranscriptRef.current + finalTextRef.current + (interim ? ` ${interim}` : ""));
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setMicStatus(`Speech recognition error: ${e.error}`);
      stopMic();
    };

    rec.onend = () => {
      if (listening) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
  }, [listening, stopMic]);

  function toggleMic() {
    if (!listening) {
      if (!consent) {
        alert("Confirm that the prospect has consented to transcription/notes first.");
        return;
      }
      baseTranscriptRef.current = transcript ? `${transcript}\n` : "";
      finalTextRef.current = "";
      setListening(true);
      startTimeRef.current = Date.now();
      recognitionRef.current?.start();
      setMicStatus("Listening…");
      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimer(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
      }, 500);
    } else {
      stopMic();
    }
  }

  async function handleAnalyse() {
    if (!consent) {
      alert("Confirm prospect consent to transcription/notes before analysing.");
      return;
    }
    if (transcript.trim().length < 30) {
      alert("Add a longer transcript first.");
      return;
    }
    const r = analyseConsultation({ name, goal, stage, price, raw: transcript });
    try {
      const res = await fetch("/api/consultation-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          prospectName: r.name,
          lifeStage: r.stage,
          goal: r.goal,
          priceDiscussed: r.price,
          transcript: r.raw,
          totalScore: r.total,
          scores: r.scores,
          speakerStats: r.st,
          questionCount: r.q,
          openQuestionCount: r.oq,
          objections: r.obs,
          buyingSignals: r.buy,
          persona: r.persona,
          diagnosis: r.diag,
          followupMessage: r.followup,
          prospectConsent: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const saved = data.report as ConsultReport;
        setReports((prev) => [saved, ...prev]);
        setReport(saved);
        if (leadId) {
          setLeadStage((prev) => {
            if (prev === "trial" || prev === "won") return prev;
            if (r.buy.length >= 2 && r.total >= 70) return "trial";
            return "consultation";
          });
          setPipelineMsg("Follow-up saved to lead next action.");
        }
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        alert(data?.error ?? "Could not save report — check your connection and try again.");
        setReport(r);
      }
    } catch {
      alert("Could not save report — check your connection and try again.");
      setReport(r);
    }
    setView("report");
  }

  function loadDemo() {
    setName("Arjun");
    setStage("College student, 21");
    setGoal("Lose fat and feel confident");
    setPrice("₹15,000 / month");
    setTranscript(DEMO_TRANSCRIPT);
  }

  const crmDetail = reports.find((r) => r.id === crmId);

  return (
    <div className={`closeOs${embedded ? " embedded" : ""}`}>
      {!embedded && (
      <div className="nav">
        <div className="navin">
          <div className="brand">
            CLOSE OS
            <small>PT SALES COPILOT · LMNT FITNESS</small>
          </div>
          <div className="tabs">
            {(
              [
                ["consult", "Consult"],
                ["report", "Report"],
                ["crm", "Prospects"],
                ["coach", "Coach DNA"],
                ["library", "Objections"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tab ${view === id ? "active" : ""}`}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {embedded && (
        <div className="embedded-tabs">
          {(
            [
              ["consult", "Consult"],
              ["report", "Report"],
              ["crm", "Prospects"],
              ["coach", "Coach DNA"],
              ["library", "Objections"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tab ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <main className="shell">
        {view === "consult" && (
          <div className="hero">
            <div className="card">
              <div className="eyebrow">Start a consultation</div>
              <h1>
                Listen. Understand.
                <br />
                Convert better.
              </h1>
              <p>
                Create the prospect, capture the conversation with consent, and run the sales diagnosis.
              </p>
              <div className="grid2">
                <div className="field">
                  <label>Prospect name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun" />
                </div>
                <div className="field">
                  <label>Age / life stage</label>
                  <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. College student, 21" />
                </div>
                <div className="field">
                  <label>Primary goal</label>
                  <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. lose fat, build confidence" />
                </div>
                <div className="field">
                  <label>PT price discussed</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ₹15,000 / month" />
                </div>
              </div>
              <div className="toggle">
                <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <label htmlFor="consent">
                  Prospect has been informed and consented to audio transcription/notes.
                </label>
              </div>
              <div className="micbox">
                <div className="micdot" />
                <div>
                  <b>Conversation Notetaker</b>
                  <div className="meta">{micStatus}</div>
                </div>
                <button type="button" className="btn primary push" onClick={toggleMic}>
                  {listening ? "Stop listening" : "Start listening"}
                </button>
                <b>{timer}</b>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={`Live transcription appears here. You can also paste a transcript manually. For best analysis, use labels like:
Coach: ...
Client: ...`}
              />
              <div className="row">
                <button type="button" className="btn primary" onClick={handleAnalyse}>
                  Analyse consultation
                </button>
                <button type="button" className="btn soft" onClick={loadDemo}>
                  Load demo
                </button>
                <button
                  type="button"
                  className="btn soft"
                  onClick={() => {
                    setName("");
                    setStage("");
                    setGoal("");
                    setPrice("");
                    setTranscript("");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="card">
              <h2>Live Coach Assist</h2>
              {!live ? (
                <div className="empty">
                  Start typing or transcribing. The copilot will watch for objections and buying signals.
                </div>
              ) : (
                <div>
                  <div className="kicker">Current read</div>
                  <p>
                    <span className="badge amber">{live.diag}</span>
                    {live.buy.map((x) => (
                      <span key={x} className="badge green">
                        {x}
                      </span>
                    ))}
                  </p>
                  <div className="script">
                    <b>Suggested next move</b>
                    <br />
                    {live.next}
                  </div>
                </div>
              )}
              <div className="divider" />
              <div className="notice">
                <strong>Important:</strong> Use the personality read as a communication hypothesis, not a diagnosis.
              </div>
            </div>
          </div>
        )}

        {view === "report" && !report && (
          <div className="empty">Analyse a consultation first.</div>
        )}

        {view === "report" && report && (
          <>
            <div className="grid2">
              <div className="card">
                <div className="eyebrow">Sales Conversation MRI</div>
                <h2>
                  {report.name} · {new Date(report.date).toLocaleDateString()}
                </h2>
                <div className="scorewrap">
                  <div
                    className="ring"
                    style={{
                      background: `conic-gradient(var(--blue) 0 ${report.total}%, #edf0f5 ${report.total}% 100%)`,
                    }}
                  >
                    <b>{report.total}</b>
                  </div>
                  <div className="bars">
                    {Object.entries(report.scores).map(([k, v]) => (
                      <div key={k} className="bar">
                        <span>{k}</span>
                        <div className="track">
                          <div className="fill" style={{ width: `${v}%` }} />
                        </div>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <h2>Prospect Intelligence</h2>
                <span className="badge">{report.persona}</span>
                <span className="badge amber">{report.diag}</span>
                <p>
                  <b>Goal:</b> {report.goal || "Not captured"}
                  <br />
                  <b>Life stage:</b> {report.stage || "Not captured"}
                  <br />
                  <b>Price discussed:</b> {report.price || "Not captured"}
                </p>
              </div>
            </div>
            <div className="grid3" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Talk Ratio</h2>
                <div className="grid2">
                  <div className="stat">
                    <b>{report.st.coach}%</b>
                    <span>COACH</span>
                  </div>
                  <div className="stat">
                    <b>{report.st.client}%</b>
                    <span>PROSPECT</span>
                  </div>
                </div>
                <p className="small">
                  {report.q} coach questions · {report.oq} open-ended
                </p>
              </div>
              <div className="card">
                <h2>Buying Signals</h2>
                {report.buy.length ? (
                  report.buy.map((x) => (
                    <span key={x} className="badge green">
                      {x}
                    </span>
                  ))
                ) : (
                  <p>No clear buying signal detected.</p>
                )}
              </div>
              <div className="card">
                <h2>Objection Diagnosis</h2>
                <span className="badge amber">{report.diag}</span>
                {report.obs.length > 0 && <p>{report.obs.join(", ")}</p>}
              </div>
            </div>
            <div className="grid2" style={{ marginTop: 18 }}>
              <div className="card">
                <h2>Where the sale moved</h2>
                <div className="timeline">
                  {findMoments(report.raw).map((m, i) => (
                    <div key={i} className={`moment ${m.type}`}>
                      <div className="time">{m.time}</div>
                      <div className="quote">“{m.quote}”</div>
                      <div className="why">{m.why}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h2>Follow-up Message</h2>
                <p className="small">
                  Saved to the lead&apos;s next action when linked to a pipeline prospect.
                </p>
                <div className="script">{report.followup}</div>
                <div className="row">
                  <button
                    type="button"
                    className="btn soft mini"
                    onClick={() => navigator.clipboard?.writeText(report.followup)}
                  >
                    Copy message
                  </button>
                  {leadId ? (
                    <button
                      type="button"
                      className="btn soft mini"
                      onClick={async () => {
                        await fetch("/api/leads", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: leadId, nextAction: report.followup }),
                        });
                        setPipelineMsg("Next action updated on lead.");
                      }}
                    >
                      Save to lead
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {leadId ? (
              <div className="card" style={{ marginTop: 18 }}>
                <h2>Pipeline</h2>
                <p className="small">
                  Current stage: <strong>{leadStage || "—"}</strong>
                </p>
                <div className="row">
                  <button type="button" className="btn soft mini" onClick={() => advancePipeline("trial")}>
                    Move to trial
                  </button>
                  <button type="button" className="btn primary mini" onClick={() => advancePipeline("convert")}>
                    Convert to client
                  </button>
                  <button type="button" className="btn soft mini" onClick={() => advancePipeline("lost")}>
                    Mark lost
                  </button>
                </div>
                {pipelineMsg ? <p className="small">{pipelineMsg}</p> : null}
              </div>
            ) : null}
            <div className="card" style={{ marginTop: 18 }}>
              <h2>Coach Improvement</h2>
              {Object.entries(report.scores)
                .sort((a, b) => a[1] - b[1])
                .slice(0, 3)
                .map(([k, v], i) => (
                  <div key={k} className="listitem">
                    <b>
                      {i + 1}. {k} — {v}/100
                    </b>
                    <span>{improvementFor(k)}</span>
                  </div>
                ))}
            </div>
          </>
        )}

        {view === "crm" && (
          <div className="grid2">
            <div className="card">
              <h2>Prospect CRM</h2>
              {reports.length === 0 ? (
                <div className="empty">No consultations saved yet.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="prospect" onClick={() => setCrmId(r.id)}>
                    <div>
                      <b>{r.name}</b>
                      <small>
                        {r.goal || "No goal"} · {new Date(r.date).toLocaleDateString()}
                      </small>
                      <small>{r.diag}</small>
                    </div>
                    <span className="badge">{r.total}/100</span>
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <h2>Selected Prospect</h2>
              {!crmDetail ? (
                <div className="empty">Select a prospect to see consultation history.</div>
              ) : (
                <>
                  <h3>{crmDetail.name}</h3>
                  <p>
                    {crmDetail.goal || "Goal not captured"} · {crmDetail.stage || "Life stage not captured"}
                  </p>
                  <div className="grid2">
                    <div className="stat">
                      <b>{crmDetail.total}</b>
                      <span>CONVERSATION SCORE</span>
                    </div>
                    <div className="stat">
                      <b>{crmDetail.st.client}%</b>
                      <span>CLIENT TALK</span>
                    </div>
                  </div>
                  <div className="divider" />
                  <div className="script">{crmDetail.followup}</div>
                  <button
                    type="button"
                    className="btn primary mini"
                    onClick={() => {
                      setReport(crmDetail);
                      setView("report");
                    }}
                  >
                    Open full report
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {view === "coach" && (
          <div className="grid2">
            <div className="card">
              <div className="eyebrow">Pattern intelligence</div>
              <h2>Your Coach DNA</h2>
              {!coachDna ? (
                <div className="empty">Complete a few consultations to build your Coach DNA.</div>
              ) : (
                <>
                  <div className="grid3">
                    <div className="stat">
                      <b>{coachDna.count}</b>
                      <span>CONSULTATIONS</span>
                    </div>
                    <div className="stat">
                      <b>{coachDna.avg}</b>
                      <span>AVG SCORE</span>
                    </div>
                    <div className="stat">
                      <b>{coachDna.clientTalk}%</b>
                      <span>AVG CLIENT TALK</span>
                    </div>
                  </div>
                  <p>
                    <span className="badge green">
                      Strongest: {coachDna.strong[0]} {coachDna.strong[1]}
                    </span>
                    <span className="badge red">
                      Weakest: {coachDna.weak[0]} {coachDna.weak[1]}
                    </span>
                  </p>
                </>
              )}
            </div>
            <div className="card">
              <h2>This week&apos;s coaching focus</h2>
              {coachDna ? (
                <>
                  <div className="script">
                    <b>{coachDna.weak[0]}</b>
                    <br />
                    {coachDna.weeklyFocus}
                  </div>
                  <p>Use the next 5 consultations as a practice block.</p>
                </>
              ) : (
                <p>Your recurring weak points will appear here.</p>
              )}
            </div>
          </div>
        )}

        {view === "library" && (
          <div className="card">
            <div className="eyebrow">PT-specific objection intelligence</div>
            <h2>Objection Library</h2>
            <input
              className="field"
              style={{ marginBottom: 10 }}
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
              placeholder="Search: expensive, spouse, time, discount..."
            />
            {library.map((o) => (
              <div key={o.title} className="obcard">
                <b>{o.title}</b>
                <div>
                  {o.types.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="route">{o.route}</div>
              </div>
            ))}
          </div>
        )}

        <div className="footer">CLOSE OS · LMNT Coach OS · consultations sync to your leads pipeline</div>
      </main>
    </div>
  );
}
