"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  displayStatusTone,
  gymMembershipDisplayStatus,
  packLabel,
  type GymMembershipStatus,
} from "@/lib/gym-membership";
import type { gymMemberships } from "@/db/schema";
import { AddGymMembershipForm } from "@/components/admin/add-gym-membership-form";

type Row = typeof gymMemberships.$inferSelect;

export function GymMembershipPanel({
  membership,
  memberId,
  memberName,
  canEdit,
  members,
  centres,
}: {
  membership: Row | null;
  memberId: string;
  memberName: string;
  canEdit: boolean;
  members: { id: string; name: string; centreId: string }[];
  centres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const display = membership
    ? gymMembershipDisplayStatus(membership.status, membership.endsAt)
    : null;

  async function setStatus(status: GymMembershipStatus) {
    if (!membership) return;
    setUpdating(true);
    await fetch("/api/gym-memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: membership.id, status }),
    });
    setUpdating(false);
    router.refresh();
  }

  return (
    <Panel
      title="Gym membership"
      action={
        canEdit ? (
          <AddGymMembershipForm
            members={members}
            centres={centres}
            fixedMemberId={memberId}
            buttonLabel={membership ? "Renew / change pack" : "Add membership"}
          />
        ) : undefined
      }
    >
      {!membership ? (
        <p className="text-sm text-[var(--workspace-muted)]">
          No gym pack for {memberName}. Use Add membership to create a 3 / 6 / 12 / 24 month pack.
        </p>
      ) : (
        <>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--workspace-muted)]">Pack type</dt>
              <dd className="font-medium">{packLabel(membership.packMonths)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--workspace-muted)]">Status</dt>
              <dd>
                {display && <Badge tone={displayStatusTone(display)}>{display}</Badge>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--workspace-muted)]">Start</dt>
              <dd className="font-medium">{formatDate(membership.startsAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--workspace-muted)]">End</dt>
              <dd className="font-medium">{formatDate(membership.endsAt)}</dd>
            </div>
          </dl>
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={updating}
                onClick={() => setStatus("active")}
                className="rounded-md border border-[var(--workspace-border)] px-2 py-1 text-xs hover:bg-[var(--workspace-bg)]"
              >
                Active
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => setStatus("paused")}
                className="rounded-md border border-[var(--workspace-border)] px-2 py-1 text-xs hover:bg-[var(--workspace-bg)]"
              >
                Paused
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => setStatus("inactive")}
                className="rounded-md border border-[var(--workspace-border)] px-2 py-1 text-xs hover:bg-[var(--workspace-bg)]"
              >
                Inactive
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}