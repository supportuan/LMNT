export const DOMAINS = [
  "Assessment",
  "Programming",
  "Coaching Eye",
  "Communication",
  "Psychology",
  "Accountability",
  "Sales",
  "Professionalism",
] as const;

export type DomainScores = Partial<Record<(typeof DOMAINS)[number], number>>;

export type ScenarioOption = [string, DomainScores];

export type Scenario = {
  time: string;
  name: string;
  tags: string[];
  say: string;
  q: string;
  options: ScenarioOption[];
  multi: boolean;
};

type BankEntry = [string, string[], string, string, ScenarioOption[]];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeScene(type: keyof typeof banks, time: string, multi = false): Scenario {
  const bank = banks[type] as BankEntry[];
  const x = pickRandom(bank);
  return {
    time,
    name: x[0],
    tags: x[1],
    say: x[2],
    q: x[3],
    options: x[4],
    multi,
  };
}

export function newCoachingDay(): Scenario[] {
  return [
    makeScene("lead", "9:00 AM · NEW LEAD"),
    makeScene("first", "10:30 AM · FIRST SESSION", true),
    makeScene("floor", "12:00 PM · GYM FLOOR"),
    makeScene("progress", "4:00 PM · PROGRESS"),
    makeScene("renewal", "7:00 PM · RENEWAL"),
  ];
}

export const banks = {
  lead: [
    [
      "Rahul",
      ["32", "Fat-loss goal", "First enquiry"],
      "“I want to lose my belly. How much do you charge?”",
      "What do you do first?",
      [
        ["Ask what result he wants and what has stopped him before", { Assessment: 3, Communication: 2, Sales: 3 }],
        ["Ask what he has already tried and why it didn't last", { Assessment: 3, Communication: 2, Sales: 2 }],
        ["Briefly explain your process, then explore his main goal", { Communication: 2, Sales: 2, Assessment: 1 }],
        ["Invite him for an assessment before recommending a plan", { Assessment: 2, Professionalism: 3, Sales: 2 }],
      ],
    ],
    [
      "Neha",
      ["28", "Strength goal", "First enquiry"],
      "“I've tried group classes. I want to get stronger now.”",
      "What do you explore first?",
      [
        ["What stronger means to her in daily life", { Assessment: 3, Communication: 3 }],
        ["What she liked and disliked about group classes", { Assessment: 3, Psychology: 2 }],
        ["How often she can realistically train", { Assessment: 2, Programming: 2 }],
        ["Her previous injuries and current readiness", { Professionalism: 3, Assessment: 2 }],
      ],
    ],
  ],
  first: [
    [
      "Anita",
      ["46", "Beginner", "Previous knee pain", "Low confidence"],
      "You have 10 minutes before training.",
      "Choose your FIVE priorities in order.",
      [
        ["Pain/readiness discussion", { Assessment: 3, Professionalism: 3 }],
        ["Goal discussion", { Assessment: 2, Communication: 2 }],
        ["Training history", { Assessment: 2, Professionalism: 1 }],
        ["Movement capacity", { Assessment: 2, "Coaching Eye": 3 }],
        ["Lifestyle & schedule", { Assessment: 2, Psychology: 2 }],
        ["Gentle warm-up while observing movement", { Programming: 2, "Coaching Eye": 2 }],
        ["Confidence/fear discussion", { Psychology: 3, Communication: 2 }],
      ],
    ],
  ],
  floor: [
    [
      "Arjun",
      ["29", "Squat session", "No pain"],
      "Heel rise, knee drift and trunk collapse appear as fatigue increases.",
      "Your first coaching move?",
      [
        ["Reduce load slightly and see whether control improves", { "Coaching Eye": 2, Programming: 3 }],
        ["Ask about discomfort and observe another rep", { "Coaching Eye": 3, Assessment: 3 }],
        ["Give one cue for the highest-priority issue", { "Coaching Eye": 3, Communication: 3 }],
        ["Use a simpler squat variation and reassess", { "Coaching Eye": 2, Programming: 3 }],
      ],
    ],
  ],
  progress: [
    [
      "Priya",
      ["36", "3 weeks PT", "9/9 attendance", "Scale unchanged"],
      "“I'm doing everything. My weight hasn't moved.”",
      "How do you open?",
      [
        ["Review training and lifestyle data together", { Accountability: 3, Communication: 3, Assessment: 2 }],
        ["Ask what she means by 'everything' and explore the week", { Assessment: 3, Communication: 3, Psychology: 2 }],
        ["Check nutrition adherence first, then review other drivers", { Assessment: 3, Accountability: 2 }],
      ],
    ],
  ],
  renewal: [
    [
      "Meera",
      ["41", "3 months PT", "Good progress", "12 sessions/month"],
      "“I like training with you, but ₹12,000 every month is becoming difficult.”",
      "What do you explore first?",
      [
        ["What support she still needs and what feels difficult", { Sales: 3, Communication: 3, Psychology: 2 }],
        ["Her progress and what she wants to achieve next", { Sales: 3, Accountability: 3, Communication: 2 }],
        ["Whether cost, frequency or support is the main concern", { Sales: 3, Assessment: 3 }],
      ],
    ],
  ],
};

export type ProfileInput = {
  role: string;
  exp: number;
  cert: number;
  cpr: number;
  clients: number;
  clientValue: number;
  income: number;
  target: number;
  timeline: number;
  hours: number;
  sessions: number;
  leads: number;
  conversions: number;
  retention: number;
  checkin: number;
  fit: number;
  referrals: number;
  marketing: number;
  direction: string;
  niche: string;
};

export function money(v: number) {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}
