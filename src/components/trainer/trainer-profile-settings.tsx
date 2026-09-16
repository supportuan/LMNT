"use client";

import { useState } from "react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Button, Panel } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { TrainerMarketplaceForm } from "@/components/trainer/trainer-marketplace-form";
import { MeBoundariesForm } from "@/components/trainer/me-boundaries-form";

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
  blocks,
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
    nonNegotiables: { label: string; done: boolean }[];
    notifications: Notifications;
  };
  blocks: {
    id: string;
    dayOfWeek: number;
    timeSlot: string;
    blockType: string;
    label: string;
  }[];
}) {
  const [notifications, setNotifications] = useState(settings.notifications);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveNotifications() {
    setSaving(true);
    await fetch("/api/trainer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <Panel title="Trainer profile">
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
      </Panel>

      <Panel title="Gym details">
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
      </Panel>

      <Panel title="Notifications">
        <div className="space-y-3 text-sm">
          {(
            [
              ["sessionReminders", "Session reminders"],
              ["clientUpdates", "Client updates"],
              ["emailDigest", "Email digest"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--workspace-border)] px-4 py-3">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notifications[key]}
                onChange={(e) => setNotifications((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            </label>
          ))}
          <Button type="button" size="sm" onClick={saveNotifications} disabled={saving}>
            {saving ? "Saving…" : "Save notifications"}
          </Button>
          {saved && <span className="ml-2 text-xs text-[var(--status-success)]">Saved</span>}
        </div>
      </Panel>

      <Panel title="Account">
        <p className="mb-4 text-sm text-[var(--workspace-muted)]">Change your password, then sign out on shared devices.</p>
        <ChangePasswordForm />
        <div className="mt-6 max-w-xs">
          <LogoutButton />
        </div>
      </Panel>

      <MeBoundariesForm settings={settings} blocks={blocks} />
    </div>
  );
}
