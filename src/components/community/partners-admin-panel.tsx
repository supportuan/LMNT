"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import type { AgreementRow } from "@/modules/community-queries";

export function PartnersAdminPanel({
  agreements,
  centres,
}: {
  agreements: AgreementRow[];
  centres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    category: "nutrition",
    description: "",
    centreId: centres[0]?.id ?? "",
  });
  const [reviewSummary, setReviewSummary] = useState<Record<string, string>>({});

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerForm.name.trim()) return;
    setCreating(true);
    await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: partnerForm.name,
        category: partnerForm.category,
        description: partnerForm.description || undefined,
        centreId: partnerForm.centreId || undefined,
      }),
    });
    setCreating(false);
    setPartnerForm({ name: "", category: "nutrition", description: "", centreId: centres[0]?.id ?? "" });
    router.refresh();
  }

  async function patchAgreement(id: string, body: Record<string, string>) {
    setLoadingId(id);
    await fetch(`/api/service-agreements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoadingId(null);
    router.refresh();
  }

  async function submitReview(agreementId: string) {
    const summary = reviewSummary[agreementId]?.trim();
    if (!summary) return;
    setLoadingId(`review-${agreementId}`);
    await fetch(`/api/service-agreements/${agreementId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        metrics: { referrals: 0, satisfaction: 4 },
      }),
    });
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Panel>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--workspace-muted)]">
          Add partner
        </h3>
        <form onSubmit={createPartner} className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
            placeholder="Partner name"
            value={partnerForm.name}
            onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select
            className="rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
            value={partnerForm.category}
            onChange={(e) => setPartnerForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="nutrition">Nutrition</option>
            <option value="physio">Physio</option>
            <option value="apparel">Apparel</option>
            <option value="wellness">Wellness</option>
            <option value="other">Other</option>
          </select>
          <select
            className="rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
            value={partnerForm.centreId}
            onChange={(e) => setPartnerForm((f) => ({ ...f, centreId: e.target.value }))}
          >
            <option value="">All branches</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm md:col-span-2"
            placeholder="Description"
            value={partnerForm.description}
            onChange={(e) => setPartnerForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create partner"}
          </Button>
        </form>
      </Panel>

      <Panel>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--workspace-muted)]">
          Service agreements
        </h3>
        <div className="space-y-4">
          {agreements.length === 0 ? (
            <p className="text-sm text-[var(--workspace-muted)]">No agreements yet. Create a partner first, then add agreements via API or seed.</p>
          ) : (
            agreements.map((agreement) => (
              <div
                key={agreement.id}
                className="rounded-xl border border-[var(--workspace-border)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{agreement.title}</div>
                    <div className="text-xs text-[var(--workspace-muted)]">
                      {agreement.partnerName}
                      {agreement.centreName ? ` · ${agreement.centreName}` : ""}
                    </div>
                  </div>
                  <Badge tone={agreement.status === "active" ? "success" : "neutral"}>
                    {agreement.status}
                  </Badge>
                </div>

                {agreement.pendingReviewPeriod && (
                  <p className="mb-2 text-xs text-[var(--status-warning)]">
                    Monthly review pending: {agreement.pendingReviewPeriod}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {agreement.status === "draft" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={loadingId === agreement.id}
                      onClick={() => patchAgreement(agreement.id, { status: "active" })}
                    >
                      Activate
                    </Button>
                  )}
                  {agreement.status === "active" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loadingId === agreement.id}
                      onClick={() => patchAgreement(agreement.id, { status: "paused" })}
                    >
                      Pause
                    </Button>
                  )}
                </div>

                {agreement.pendingReviewPeriod && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      className="flex-1 rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-sm"
                      placeholder="Monthly review summary"
                      value={reviewSummary[agreement.id] ?? ""}
                      onChange={(e) =>
                        setReviewSummary((prev) => ({ ...prev, [agreement.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={loadingId === `review-${agreement.id}`}
                      onClick={() => submitReview(agreement.id)}
                    >
                      Submit review
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
