export type NavIconName =
  | "dashboard"
  | "members"
  | "trainers"
  | "memberships"
  | "payments"
  | "assets"
  | "schedule"
  | "reports"
  | "settings"
  | "clients"
  | "sessions"
  | "progress"
  | "programs"
  | "calendar"
  | "profile"
  | "home"
  | "workout"
  | "nutrition"
  | "messages"
  | "staff"
  | "inventory"
  | "leads"
  | "audit"
  | "generic";

const icons: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
  ),
  members: (
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  trainers: (
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM4 21a8 8 0 0 1 16 0" />
  ),
  staff: (
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM4 21a8 8 0 0 1 16 0" />
  ),
  memberships: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  payments: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M16 15h2" />
    </>
  ),
  assets: (
    <>
      <path d="M6 7h12l2 5v7H4v-7l2-5Z" />
      <path d="M9 19v-4h6v4" />
    </>
  ),
  schedule: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  reports: (
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
  ),
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a7.8 7.8 0 0 0 .1-6l2-1.2-2-3.4-2.3.8a8 8 0 0 0-5.2-2.1L11.4 1h-4l-.6 2.1A8 8 0 0 0 1.6 5.2L.3 3 0 6.4l2 1.2a7.8 7.8 0 0 0 .1 6l-2 1.2 2 3.4 2.3-.8a8 8 0 0 0 5.2 2.1l.6 2.1h4l.6-2.1a8 8 0 0 0 5.2-2.1l2.3.8 2-3.4-2-1.2Z" />
  ),
  clients: (
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
  ),
  sessions: (
    <path d="M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
  ),
  progress: (
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
  ),
  programs: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="4" cy="18" r="1.2" />
    </>
  ),
  profile: (
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM4 21a8 8 0 0 1 16 0" />
  ),
  home: (
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
  ),
  workout: (
    <path d="M7 7v10M17 7v10M4 10h3M17 10h3M4 14h3M17 14h3M10 9v6h4V9" />
  ),
  nutrition: (
    <path d="M12 3c4 4 6 7 6 11a6 6 0 0 1-12 0c0-4 2-7 6-11Z" />
  ),
  messages: (
    <path d="M4 5h16v12H8l-4 4V5Z" />
  ),
  inventory: (
    <path d="M3 7 12 3l9 4v10l-9 4-9-4V7ZM12 12l9-4M12 12v10M12 12 3 8" />
  ),
  leads: (
    <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
  ),
  audit: (
    <>
      <path d="M8 6h8v14H8z" />
      <path d="M10 10h4M10 14h4" />
    </>
  ),
  generic: <circle cx="12" cy="12" r="3" />,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icons[name] ?? icons.generic}
    </svg>
  );
}

export function iconForHref(href: string, label: string): NavIconName {
  if (href.includes("analytics") || label === "Dashboard" || label === "Today") return "dashboard";
  if (label === "Week") return "calendar";
  if (href.includes("tasks")) return "sessions";
  if (href.includes("development")) return "progress";
  if (href.includes("memberships") || label === "Membership plans") return "memberships";
  if (href.includes("members")) return "members";
  if (href.includes("payments") || href.includes("money")) return "payments";
  if (href.includes("assets")) return "assets";
  if (href.includes("calendar") || href.includes("schedule") || label === "Schedule") return "schedule";
  if (href.includes("reports")) return "reports";
  if (href.includes("settings") || href.includes("organisation") || href.includes("me") || href.includes("profile"))
    return "settings";
  if (href.includes("clients")) return "clients";
  if (href.includes("sessions")) return "sessions";
  if (href.includes("progress")) return "progress";
  if (href.includes("program")) return "programs";
  if (href.includes("home")) return "home";
  if (href.includes("workout")) return "workout";
  if (href.includes("nutrition")) return "nutrition";
  if (href.includes("messages")) return "messages";
  if (href.includes("inventory")) return "inventory";
  if (href.includes("work-requests")) return "assets";
  if (href.includes("leads") || href.includes("sales")) return "leads";
  if (href.includes("audit")) return "audit";
  return "generic";
}
