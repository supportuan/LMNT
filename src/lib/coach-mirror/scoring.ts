import { DOMAINS, money, type ProfileInput, type Scenario } from "./scenarios";

export type MirrorResult = {
  headline: string;
  overall: number;
  profileScores: Record<string, number>;
  weak: string;
  income: {
    curIncome: string;
    curPT: string;
    goalIncome: string;
    potential: string;
    planHtml: string;
  };
  pathway: [string, string][];
  pathSteps: [string, string][];
  checklist: string[];
};

export function computeMirrorResult(
  scenes: Scenario[],
  answers: number[][],
  profile: ProfileInput,
): MirrorResult {
  const raw: Record<string, number> = Object.fromEntries(DOMAINS.map((x) => [x, 0]));

  scenes.forEach((s, si) => {
    (answers[si] ?? []).forEach((a, pos) => {
      const opt = s.options[a];
      if (!opt) return;
      Object.entries(opt[1]).forEach(([k, v]) => {
        raw[k] = (raw[k] ?? 0) + v * (s.multi ? Math.max(0.72, 1 - pos * 0.06) : 1);
      });
    });
  });

  const sc: Record<string, number> = {};
  DOMAINS.forEach((k) => {
    sc[k] = Math.min(100, Math.round(38 + (raw[k] ?? 0) * 8));
  });

  const qualification = Math.min(
    100,
    22 + profile.cert * 21 + profile.cpr * 14 + (profile.exp >= 2 ? 10 : 0),
  );
  const ownFitness = Math.min(100, 30 + profile.fit * 20);
  const systems = Math.min(100, 32 + profile.checkin * 18 + Math.round(sc.Accountability / 5));

  const profileScores: Record<string, number> = {
    Fitness: ownFitness,
    Qualifications: qualification,
    Assessment: sc.Assessment,
    Programming: sc.Programming,
    "Coaching Eye": sc["Coaching Eye"],
    Communication: sc.Communication,
    Psychology: sc.Psychology,
    Accountability: sc.Accountability,
    Sales: sc.Sales,
    Professionalism: Math.round((sc.Professionalism + systems) / 2),
  };

  const overall = Math.round(
    Object.values(profileScores).reduce((a, b) => a + b, 0) / Object.keys(profileScores).length,
  );

  const sorted = Object.keys(profileScores).sort((a, b) => profileScores[a] - profileScores[b]);
  const weak = sorted[0];

  const headline =
    overall < 50
      ? "FOUNDATION PT"
      : overall < 65
        ? "DEVELOPING PT"
        : overall < 80
          ? "COACHING PT"
          : "OUTCOME-DRIVEN PT";

  const currentPT = profile.clients * profile.clientValue;
  const conversionRate = profile.leads > 0 ? Math.min(1, profile.conversions / profile.leads) : 0;
  const practicalMaxClients =
    profile.sessions > 0
      ? Math.max(profile.clients, Math.floor((profile.hours * 0.72) / profile.sessions))
      : profile.clients;
  const skillFactor = Math.min(1.25, 0.65 + overall / 200);
  const systemFactor = 1 + profile.checkin * 0.04 + profile.referrals * 0.05 + profile.marketing * 0.05;
  const retentionFactor = Math.min(1.22, 0.82 + profile.retention * 0.035);
  const improvedConversion = Math.min(
    0.65,
    Math.max(conversionRate, conversionRate * 0.9 + 0.08 + sc.Sales / 1000),
  );
  const leadGrowth = Math.round(profile.leads * (1 + profile.marketing * 0.18 + profile.referrals * 0.12));
  const monthlyAdds = leadGrowth * improvedConversion;
  const churn = Math.max(0.04, 1 / Math.max(2, profile.retention));
  const sustainableClients = Math.min(
    practicalMaxClients,
    Math.max(profile.clients, Math.round((monthlyAdds / churn) * 0.35 + profile.clients)),
  );
  const proposedClientValue = Math.round(
    profile.clientValue * Math.min(1.25, Math.max(1, skillFactor)) * systemFactor,
  );
  const probablePT = sustainableClients * proposedClientValue;
  const nonPTBase = Math.max(0, profile.income - currentPT);
  const probable = Math.round((probablePT + nonPTBase) * retentionFactor);
  const cappedProbable = Math.min(probable, profile.target * 1.3 || probable);

  const gap = Math.max(0, profile.target - profile.income);
  const futureGap = Math.max(0, profile.target - cappedProbable);

  const planHtml = `<b>Your present gap is ${money(gap)} per month.</b><br>Based on your current client value, available hours, lead flow, conversion, retention, systems and coaching readiness, a practical next-stage model is approximately <b>${sustainableClients} active clients × ${money(proposedClientValue)} average monthly client value</b>. That creates a probable fitness-income capacity around <b>${money(cappedProbable)}/month</b> if the plan below is executed consistently.${futureGap > 0 ? ` You would still be about <b>${money(futureGap)}</b> short of your target.` : " This is enough to put your stated income goal within practical reach."}`;

  const pathway: [string, string][] = [];
  if (profile.cert < 2)
    pathway.push([
      "Foundation",
      "Secure a recognised CPT qualification and current CPR/First Aid before building higher-level positioning.",
    ]);
  else
    pathway.push([
      "Foundation",
      "Keep your core qualification current and deepen the areas that directly support your chosen client type.",
    ]);

  if (overall < 65)
    pathway.push([
      "Coaching capability",
      `Build ${weak} first. Your income ceiling will remain unstable if client outcomes depend mainly on session delivery.`,
    ]);
  else
    pathway.push([
      "Coaching capability",
      "Document outcomes, improve reassessment quality and make your coaching system repeatable across clients.",
    ]);

  if (profile.checkin < 2)
    pathway.push([
      "Client system",
      "Introduce one structured weekly check-in, measurable behaviour targets and a visible progress review.",
    ]);
  if (profile.leads < 6 || profile.marketing < 2)
    pathway.push([
      "Lead flow",
      "Create consistent weekly visibility: education/content, referrals, floor conversations or local partnerships.",
    ]);
  if (conversionRate < 0.3)
    pathway.push([
      "Conversion",
      "Use a discovery-led consultation: problem → history → barriers → desired outcome → recommendation → package.",
    ]);
  if (profile.retention < 6)
    pathway.push([
      "Retention",
      "Build a 4-week progress conversation and define the next objective before the current package ends.",
    ]);

  pathway.push([
    "Positioning",
    `Build proof around ${profile.niche.toLowerCase()} and make that expertise visible. Your selected direction is: ${profile.direction}.`,
  ]);
  pathway.push([
    "Income model",
    `Aim first for roughly ${sustainableClients} sustainable active clients at about ${money(proposedClientValue)} average monthly value before adding unnecessary complexity.`,
  ]);

  const pathSteps: [string, string][] = [
    [
      "Now → 30 days",
      `Fix ${weak}; install weekly check-ins; track leads, consultations, conversions, active clients, average client value and renewals.`,
    ],
    [
      "30 → 90 days",
      `Build 3 documented client case studies in ${profile.niche.toLowerCase()}; target ${Math.max(profile.conversions + 1, Math.ceil(leadGrowth * improvedConversion))} new clients/month from an improved lead and consultation system.`,
    ],
    [
      `By ${profile.timeline} months`,
      `Move toward ${sustainableClients} sustainable clients at approximately ${money(proposedClientValue)} average value while protecting quality and retention.`,
    ],
    [
      "Next career move",
      profile.direction === "Not sure yet"
        ? "Use your strongest client results to decide between commercial PT, freelance, specialist or hybrid coaching."
        : `Build specifically toward ${profile.direction.toLowerCase()} rather than collecting unrelated certifications.`,
    ],
  ];

  const today: string[] = [];
  if (profile.cert < 2) today.push("Shortlist one recognised CPT pathway and set an enrolment date.");
  if (!profile.cpr) today.push("Book CPR / First Aid.");
  today.push("Create a one-page client intake covering goal, history, readiness, lifestyle and barriers.");
  if (profile.checkin < 2)
    today.push("Create one weekly check-in form and use it with every active client this week.");
  today.push("Start one business tracker: leads → consultations → sales → active clients → renewals → monthly income.");
  if (conversionRate < 0.3)
    today.push("Use a 5-question discovery structure before discussing packages with your next prospect.");
  if (profile.marketing < 2)
    today.push("Publish or share one useful coaching insight this week that speaks directly to your preferred client type.");
  if (profile.referrals < 2) today.push("Ask one satisfied client for a referral after showing them their progress.");
  today.push(`Write your target visibly: ${money(profile.target)}/month within ${profile.timeline} months — and review the numbers every week.`);

  return {
    headline,
    overall,
    profileScores,
    weak,
    income: {
      curIncome: money(profile.income),
      curPT: money(currentPT),
      goalIncome: money(profile.target),
      potential: money(cappedProbable),
      planHtml,
    },
    pathway,
    pathSteps,
    checklist: today.slice(0, 10),
  };
}
