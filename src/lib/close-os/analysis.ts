import { OBJECTION_LIBRARY, type ObjectionEntry } from "./objection-library";

export type SpeakerStats = { coach: number; client: number; labelled: boolean };
export type ConversationScores = Record<string, number>;
export type ConsultMoment = {
  type: "good" | "warn" | "bad";
  time: string;
  quote: string;
  why: string;
};

export type ConsultReport = {
  id: string | number;
  date: string;
  name: string;
  goal: string;
  stage: string;
  price: string;
  raw: string;
  total: number;
  scores: ConversationScores;
  st: SpeakerStats;
  q: number;
  oq: number;
  obs: string[];
  buy: string[];
  persona: string;
  diag: string;
  followup: string;
};

function words(s: string) {
  return s.toLowerCase().match(/[a-z₹0-9']+/g) ?? [];
}

function has(s: string, arr: string[]) {
  const t = s.toLowerCase();
  return arr.some((k) => t.includes(k));
}

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function splitLines(raw: string) {
  return raw
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function speakerStats(raw: string): SpeakerStats {
  let coach = 0;
  let client = 0;
  splitLines(raw).forEach((l) => {
    const n = words(l.replace(/^(coach|client|prospect|member)\s*:/i, "")).length;
    if (/^coach\s*:/i.test(l)) coach += n;
    else if (/^(client|prospect|member)\s*:/i.test(l)) client += n;
  });
  if (coach + client === 0) return { coach: 50, client: 50, labelled: false };
  const total = coach + client;
  return {
    coach: Math.round((coach / total) * 100),
    client: Math.round((client / total) * 100),
    labelled: true,
  };
}

function countQuestions(raw: string) {
  return splitLines(raw)
    .filter((l) => /^coach\s*:/i.test(l))
    .reduce((a, l) => a + (l.match(/\?/g)?.length ?? 0), 0);
}

function openQuestionCount(raw: string) {
  return splitLines(raw).filter(
    (l) =>
      /^coach\s*:/i.test(l) &&
      /\b(what|how|why|tell me|walk me through|help me understand)\b/i.test(l) &&
      l.includes("?"),
  ).length;
}

export function detectObjections(raw: string): ObjectionEntry[] {
  const t = raw.toLowerCase();
  return OBJECTION_LIBRARY.filter((o) => o.keys.some((k) => t.includes(k))).slice(0, 5);
}

export function detectBuyingSignals(raw: string) {
  const signals = [
    ["Scheduling", "what time", "which days", "same time", "slots", "availability"],
    ["Process", "how does it work", "what happens", "assessment", "first session"],
    ["Payment", "how do i pay", "payment", "emi", "installment"],
    ["Start intent", "when can i start", "can i start", "start today", "start tomorrow"],
    ["Logistics", "what should i bring", "where do we meet", "which gym"],
    ["Commitment detail", "how many sessions", "how many days", "how long"],
  ] as const;
  const t = raw.toLowerCase();
  return signals.filter((s) => s.slice(1).some((k) => t.includes(k))).map((s) => s[0]);
}

export function inferPersona(raw: string): [string, number] {
  const t = raw.toLowerCase();
  const scores: Record<string, number> = {
    "Analytical / Conscientious": [
      "exactly",
      "details",
      "compare",
      "proof",
      "evidence",
      "what do i get",
      "breakdown",
      "how does it work",
    ].filter((k) => t.includes(k)).length,
    "Amiable / Steady": [
      "think about",
      "comfortable",
      "trust",
      "family",
      "spouse",
      "parents",
      "scared",
      "quit",
      "support",
    ].filter((k) => t.includes(k)).length,
    "Driver / Dominant": ["fast", "result", "how long", "just tell", "quick", "goal", "start"].filter(
      (k) => t.includes(k),
    ).length,
    "Expressive / Influential": [
      "excited",
      "transform",
      "confidence",
      "look",
      "amazing",
      "love",
      "community",
    ].filter((k) => t.includes(k)).length,
  };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] === 0 ? ["Mixed / insufficient signal", 0] : (sorted[0] as [string, number]);
}

export function moneyBarrier(raw: string) {
  const t = raw.toLowerCase();
  if (
    has(t, [
      "college student",
      "student",
      "outside my budget",
      "cannot afford",
      "can't afford",
      "genuinely can't",
      "genuinely cannot",
    ])
  )
    return "Genuine affordability likely";
  if (has(t, ["worth it", "value", "why so much", "what do i get"]))
    return "Value perception likely";
  if (has(t, ["other trainer", "another trainer", "cheaper"])) return "Comparison / negotiation likely";
  if (has(t, ["didn't work", "did not work", "bad trainer", "trust"])) return "Trust / risk likely";
  if (has(t, ["quit", "motivation", "waste money"])) return "Fear of wasted commitment likely";
  if (has(t, ["expensive", "price", "cost"])) return "Price objection — underlying cause not yet proven";
  return "No dominant price objection detected";
}

export function scoreConversation(raw: string): ConversationScores {
  const q = countQuestions(raw);
  const oq = openQuestionCount(raw);
  const st = speakerStats(raw);
  return {
    Discovery: clamp(
      35 + q * 6 + oq * 7 + (has(raw, ["goal", "what made", "why now", "trying to", "what happened"]) ? 15 : 0),
    ),
    "Problem depth": clamp(
      30 +
        (has(raw, ["what happens if", "if nothing changes", "impact", "frustrat", "stopped", "problem"])
          ? 30
          : 0) +
        oq * 8,
    ),
    "Emotional motive": clamp(
      30 + (has(raw, ["feel", "confidence", "why is that important", "mean to you", "frustrated"]) ? 40 : 0),
    ),
    Listening: clamp(
      90 - Math.max(0, st.coach - 55) * 2 +
        (has(raw, ["so what i'm hearing", "from what you've told me", "sounds like", "you said"]) ? 12 : 0),
    ),
    Trust: clamp(
      40 +
        (has(raw, ["understand", "comfortable", "previous", "what happened", "assessment", "process"]) ? 35 : 0),
    ),
    Value: clamp(
      32 +
        (has(raw, [
          "accountability",
          "assessment",
          "progress",
          "tracking",
          "individual",
          "plan",
          "support",
          "course-correct",
        ])
          ? 35
          : 0) +
        (has(raw, ["because you said", "based on what you told me", "your goal"]) ? 15 : 0),
    ),
    "Objection diagnosis": clamp(
      30 +
        (has(raw, ["when you say", "is it mainly", "or are you", "genuinely", "what specifically", "stopping you"])
          ? 40
          : 0) +
        (detectObjections(raw).length ? 10 : 0),
    ),
    "Price confidence": clamp(
      55 +
        (has(raw, ["discount", "same service cheaper", "change the product", "lower-touch", "different option"])
          ? 20
          : 0) -
        (has(raw, ["i can discount", "free sessions", "extra free"]) ? 25 : 0),
    ),
    Closing: clamp(
      28 +
        (has(raw, ["would you like to", "comfortable getting started", "next step", "shall we", "start with"])
          ? 45
          : 0),
    ),
    "Next step": clamp(
      25 + (has(raw, ["follow up", "tomorrow", "next step", "book", "start", "send you"]) ? 45 : 0),
    ),
  };
}

export function findMoments(raw: string): ConsultMoment[] {
  const lines = splitLines(raw);
  const res: ConsultMoment[] = [];
  lines.forEach((l, i) => {
    const clean = l.replace(/^(coach|client|prospect|member)\s*:/i, "").trim();
    if (
      has(l, [
        "expensive",
        "afford",
        "budget",
        "think about",
        "spouse",
        "parents",
        "another trainer",
        "no time",
        "quit",
      ])
    ) {
      res.push({
        type: "warn",
        time: `Line ${i + 1}`,
        quote: clean,
        why: "Potential objection. The coach should diagnose the reason behind the surface statement before pitching or discounting.",
      });
    }
    if (
      /^coach\s*:/i.test(l) &&
      has(l, ["when you say", "is it mainly", "or are you", "what specifically", "help me understand"])
    ) {
      res.push({
        type: "good",
        time: `Line ${i + 1}`,
        quote: clean,
        why: "Good diagnostic move: separates the stated objection from the underlying barrier.",
      });
    }
    if (
      /^coach\s*:/i.test(l) &&
      has(l, ["discount", "free session", "extra session"]) &&
      !has(l, ["don't discount", "do not discount", "not discount"])
    ) {
      res.push({
        type: "bad",
        time: `Line ${i + 1}`,
        quote: clean,
        why: "Possible value leak: discounting or giving inventory away before understanding the objection can lower perceived value.",
      });
    }
    if (
      /^(client|prospect|member)\s*:/i.test(l) &&
      has(l, ["when can i start", "what time", "which days", "how do i pay", "how many sessions"])
    ) {
      res.push({
        type: "good",
        time: `Line ${i + 1}`,
        quote: clean,
        why: "Buying signal. Answer the question, then advance to a low-pressure next step.",
      });
    }
  });
  return res.slice(0, 8);
}

export function generateFollowup(name: string, goal: string, diag: string) {
  const n = name || "there";
  const g = goal || "the goal we discussed";
  if (diag.includes("affordability"))
    return `Hey ${n}, good speaking with you today. Based on what you shared about ${g}, I don’t want to push you into a PT package that isn’t financially realistic. I’ll send you the lower-touch option we discussed so you can compare it clearly. If it fits, we can take the next step from there.`;
  if (diag.includes("Value"))
    return `Hey ${n}, good speaking with you. I’ve summarised the plan around ${g} and exactly what the coaching includes, so you can judge the value rather than just the price. Have a look and tell me what still feels unclear — I’m happy to answer that directly.`;
  if (diag.includes("Trust"))
    return `Hey ${n}, thanks for being open about your previous experience. I’ve summarised how we would approach ${g} differently, including the checkpoints we’d use to make sure you know what is changing and why. No pressure — review it and tell me what would help you feel confident about the next step.`;
  return `Hey ${n}, great speaking with you today. Based on what you shared about ${g}, I’ve summarised the option that seems to fit best. Have a look and tell me if there is any concern we haven’t solved yet. If it feels right, we can decide the next step from there.`;
}

export function improvementFor(k: string) {
  const m: Record<string, string> = {
    Discovery:
      "Ask more open questions about why now, previous attempts, constraints and what success looks like before describing PT.",
    "Problem depth":
      "Go beyond the goal. Learn what the problem is costing them and what has prevented change so far.",
    "Emotional motive":
      "Ask why the goal matters personally and how the current situation affects confidence, life or capability.",
    Listening: "Reduce coach monologue. Summarise the prospect’s own words before recommending anything.",
    Trust: "Explore prior experiences and make your process transparent rather than relying on credentials alone.",
    Value: "Connect each deliverable directly to a problem the prospect said they have.",
    "Objection diagnosis":
      "Do not answer the surface statement immediately. Separate price, value, trust, logistics and commitment.",
    "Price confidence":
      "Avoid reflexive discounting or free sessions. If affordability is real, change scope/product.",
    Closing: "Once the barrier is solved, ask a clear low-pressure decision question.",
    "Next step": "End with one explicit action, owner and timing instead of “let me know.”",
  };
  return m[k] ?? "Review the conversation and make the next move more explicit.";
}

export function analyseConsultation(input: {
  name: string;
  goal: string;
  stage: string;
  price: string;
  raw: string;
}): ConsultReport {
  const scores = scoreConversation(input.raw);
  const vals = Object.values(scores);
  const total = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const st = speakerStats(input.raw);
  const q = countQuestions(input.raw);
  const oq = openQuestionCount(input.raw);
  const obs = detectObjections(input.raw);
  const buy = detectBuyingSignals(input.raw);
  const persona = inferPersona(input.raw);
  const diag = moneyBarrier(input.raw);

  return {
    id: Date.now(),
    date: new Date().toISOString(),
    name: input.name || "Unnamed prospect",
    goal: input.goal,
    stage: input.stage,
    price: input.price,
    raw: input.raw,
    total,
    scores,
    st,
    q,
    oq,
    obs: obs.map((x) => x.title),
    buy,
    persona: persona[0],
    diag,
    followup: generateFollowup(input.name, input.goal, diag),
  };
}

export function liveAssistRead(raw: string) {
  if (raw.length < 20) return null;
  const obs = detectObjections(raw);
  const buy = detectBuyingSignals(raw);
  const diag = moneyBarrier(raw);
  let next = "Keep discovering the goal, previous attempts and why this matters now.";
  if (obs.length)
    next = `Do not pitch yet. Ask: “When you say that, what is the biggest concern underneath it — the investment, the fit, or confidence this will work?”`;
  if (diag.includes("affordability"))
    next = `Affordability looks genuine. Protect the PT price. Explore a different scope/product rather than the identical service at a discount.`;
  if (buy.length)
    next = `Buying signal detected (${buy[0]}). Answer it clearly, then ask a low-pressure next-step question.`;
  return { diag, buy, next };
}


/** @deprecated Reports are persisted via /api/consultation-reports */
export function loadReports(): ConsultReport[] {
  return [];
}

/** @deprecated Reports are persisted via /api/consultation-reports */
export function saveReport(_report: ConsultReport) {
  // no-op
}

/** @deprecated Reports are persisted via /api/consultation-reports */
export function clearReports() {
  // no-op
}

export const DEMO_TRANSCRIPT = `Coach: What made you enquire about PT right now?
Client: I want to lose fat and feel confident. I keep joining gyms and stopping.
Coach: What usually makes you stop?
Client: I don't know what to do and after two weeks I lose motivation.
Coach: If nothing changes for another six months, how would you feel?
Client: Pretty bad. I really want to fix this.
Coach: From what you're telling me, consistency and knowing exactly what to do are the big issues.
Client: Yes. But ₹15,000 is expensive. I'm a college student and honestly that's outside my budget.
Coach: Understood. When you say expensive, I want to separate two things: are you unsure whether PT is worth ₹15,000, or is that amount genuinely outside what you can spend right now?
Client: It is genuinely outside my budget.
Coach: Then I don't want to discount the same PT service just to make a sale. I can show you a lower-touch option with programming and accountability that costs less because it is a different service. Would you like to see how that works?
Client: Yes. How many sessions would I need to come in for?`;
