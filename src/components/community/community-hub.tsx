"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import type { CommunityGroupRow, PartnerWithOffers } from "@/modules/community-queries";

function formatInr(amount: number | null) {
  if (amount == null) return "Member perk";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CommunityHub({
  partners,
  groups,
}: {
  partners: PartnerWithOffers[];
  groups: CommunityGroupRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function joinGroup(groupId: string) {
    setLoadingId(groupId);
    await fetch(`/api/community-groups/${groupId}/join`, { method: "POST" });
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--workspace-text)]">Member perks</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {partners.length === 0 ? (
            <Panel>
              <p className="text-sm text-[var(--workspace-muted)]">No partner offers yet.</p>
            </Panel>
          ) : (
            partners.map((partner) => (
              <Panel key={partner.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--workspace-text)]">{partner.name}</h3>
                    <p className="text-xs capitalize text-[var(--workspace-muted)]">
                      {partner.category.replace("_", " ")}
                      {partner.centreName ? ` · ${partner.centreName}` : " · All branches"}
                    </p>
                  </div>
                  <Badge tone="info">{partner.offers.length} offers</Badge>
                </div>
                {partner.description && (
                  <p className="mb-3 text-sm text-[var(--workspace-muted)]">{partner.description}</p>
                )}
                <ul className="space-y-2">
                  {partner.offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="rounded-xl border border-[var(--workspace-border)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{offer.title}</span>
                        <span className="text-xs font-semibold text-[var(--workspace-accent)]">
                          {formatInr(offer.memberPriceInr)}
                        </span>
                      </div>
                      {offer.description && (
                        <p className="mt-1 text-xs text-[var(--workspace-muted)]">{offer.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--workspace-text)]">Community groups</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {groups.length === 0 ? (
            <Panel>
              <p className="text-sm text-[var(--workspace-muted)]">No groups yet.</p>
            </Panel>
          ) : (
            groups.map((group) => (
              <Panel key={group.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-xs text-[var(--workspace-muted)]">
                      {group.centreName ?? "All branches"} · {group.memberCount} members
                    </p>
                  </div>
                  {group.joined && <Badge tone="success">Joined</Badge>}
                </div>
                {group.description && (
                  <p className="mb-3 text-sm text-[var(--workspace-muted)]">{group.description}</p>
                )}
                {!group.joined && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingId === group.id}
                    onClick={() => joinGroup(group.id)}
                  >
                    {loadingId === group.id ? "Joining…" : "Join group"}
                  </Button>
                )}
              </Panel>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
