"use client";

import { useState } from "react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LogoutButton } from "@/components/logout-button";
import { MeBoundariesForm } from "@/components/trainer/me-boundaries-form";
import { TrainerMarketplaceForm } from "@/components/trainer/trainer-marketplace-form";
import { Button } from "@/components/ui";
import { sendJson } from "@/lib/send-json";

type Notifications = {
  sessionReminders: boolean;
  clientUpdates: boolean;
  emailDigest: boolean;
};

export function TrainerProfileSettings({
  name,
  email,
  organisationName,
  gymName,
  timezone,
  profile,
  settings,
}: {
  name: string;
  email: string;
  organisationName: string;
  gymName: string;
  timezone: string;
  profile: {
    bio: string;
    specialties: string[];
    sessionsPerWeek: string;
    visible: boolean;
  };
  settings: {
    maxConsecutiveSessions: number;
    trainingDays: string | null;
    trainingTime: string | null;
    mealWindow: string | null;
    lifeNotes: string | null;
    shutdownTime: string;
    weeklyReview: { weekOf: string; worked: string; fix: string } | null;
    notifications: Notifications;
  };
}) {
  const [notifications, setNotifications] = useState(settings.notifications);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNotifications() {
    setSaving(true);
    setError(null);
    const res = await sendJson("/api/trainer/settings", "PATCH", { notifications });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="space-y-[var(--grid-gutter)]">
      <MeBoundariesForm settings={settings} />

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Trainer profile</h2>
        <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--workspace-muted)]">Name</dt>
            <dd className="font-medium">{name}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Email</dt>
            <dd className="font-medium">{email}</dd>
          </div>
        </dl>
        <TrainerMarketplaceForm
          initialBio={profile.bio}
          initialSpecialties={profile.specialties}
          initialSessionsPerWeek={profile.sessionsPerWeek}
          initialVisible={profile.visible}
        />
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Gym details</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--workspace-muted)]">Gym</dt>
            <dd className="font-medium">{organisationName}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Branch</dt>
            <dd className="font-medium">{gymName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--workspace-muted)]">Timezone</dt>
            <dd className="font-medium">{timezone}</dd>
          </div>
        </dl>
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="mb-4 text-base font-semibold tracking-tight">Notifications</h2>
        <div className="space-y-3 text-sm">
          {(
            [
              ["sessionReminders", "Session reminders"],
              ["clientUpdates", "Client updates"],
              ["emailDigest", "Email digest"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--moss-tint)] px-4 py-3 ring-1 ring-inset ring-[var(--moss-800)]"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notifications[key]}
                onChange={(e) => setNotifications((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            </label>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={saveNotifications} disabled={saving}>
              {saving ? "Saving…" : "Save notifications"}
            </Button>
            {saved && !error && <span className="text-xs text-[var(--status-success)]">Saved</span>}
            {error && <span className="text-xs text-[var(--status-danger)]">{error}</span>}
          </div>
        </div>
      </section>

      <section className="neu-card p-[var(--card-padding)]">
        <h2 className="mb-2 text-base font-semibold tracking-tight">Account</h2>
        <p className="mb-4 text-sm text-[var(--workspace-muted)]">Change your password, then sign out on shared devices.</p>
        <ChangePasswordForm />
        <div className="mt-6 max-w-xs">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
