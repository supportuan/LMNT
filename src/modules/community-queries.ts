import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agreementMonthlyReviews,
  centres,
  communityGroupMembers,
  communityGroups,
  members,
  messageReports,
  messages,
  partnerOffers,
  partners,
  serviceAgreements,
  users,
} from "@/db/schema";
import { currentPeriodLabel } from "@/lib/community/agreement-service";
import { scopedCentreIds } from "@/lib/branch-scope";
import type { SessionPayload } from "@/lib/session";

export type PartnerWithOffers = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  centreName: string | null;
  offers: {
    id: string;
    title: string;
    description: string | null;
    memberPriceInr: number | null;
  }[];
};

export type CommunityGroupRow = {
  id: string;
  name: string;
  description: string | null;
  centreName: string | null;
  memberCount: number;
  joined: boolean;
  role: string | null;
};

export type AgreementRow = {
  id: string;
  title: string;
  status: string;
  partnerName: string;
  centreName: string | null;
  startsAt: Date | null;
  pendingReviewPeriod: string | null;
};

export type ModerationReportRow = {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: Date;
  messageBody: string;
  messageHidden: boolean;
  reporterName: string;
  memberName: string;
};

function centreScope(session: SessionPayload) {
  return scopedCentreIds(session) ?? null;
}

export async function getPartnerCatalogue(session: SessionPayload): Promise<PartnerWithOffers[]> {
  const scope = centreScope(session);

  const partnerRows = await db
    .select({
      id: partners.id,
      name: partners.name,
      category: partners.category,
      description: partners.description,
      centreName: centres.name,
    })
    .from(partners)
    .leftJoin(centres, eq(partners.centreId, centres.id))
    .where(
      and(
        eq(partners.organisationId, session.organisationId),
        eq(partners.active, true),
        scope?.length ? or(isNull(partners.centreId), inArray(partners.centreId, scope)) : undefined,
      ),
    )
    .orderBy(partners.name);

  const partnerIds = partnerRows.map((p) => p.id);
  const offers =
    partnerIds.length > 0
      ? await db
          .select()
          .from(partnerOffers)
          .where(
            and(
              eq(partnerOffers.organisationId, session.organisationId),
              eq(partnerOffers.active, true),
              inArray(partnerOffers.partnerId, partnerIds),
            ),
          )
      : [];

  const offersByPartner = new Map<string, typeof offers>();
  for (const offer of offers) {
    const list = offersByPartner.get(offer.partnerId) ?? [];
    list.push(offer);
    offersByPartner.set(offer.partnerId, list);
  }

  return partnerRows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    centreName: p.centreName,
    offers: (offersByPartner.get(p.id) ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      memberPriceInr: o.memberPriceInr,
    })),
  }));
}

export async function getCommunityGroups(session: SessionPayload): Promise<CommunityGroupRow[]> {
  const scope = centreScope(session);

  const groups = await db
    .select({
      id: communityGroups.id,
      name: communityGroups.name,
      description: communityGroups.description,
      centreName: centres.name,
    })
    .from(communityGroups)
    .leftJoin(centres, eq(communityGroups.centreId, centres.id))
    .where(
      and(
        eq(communityGroups.organisationId, session.organisationId),
        eq(communityGroups.active, true),
        scope?.length
          ? or(isNull(communityGroups.centreId), inArray(communityGroups.centreId, scope))
          : undefined,
      ),
    )
    .orderBy(communityGroups.name);

  const groupIds = groups.map((g) => g.id);
  const counts =
    groupIds.length > 0
      ? await db
          .select({
            groupId: communityGroupMembers.groupId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(communityGroupMembers)
          .where(inArray(communityGroupMembers.groupId, groupIds))
          .groupBy(communityGroupMembers.groupId)
      : [];

  const countMap = new Map(counts.map((c) => [c.groupId, c.count]));

  const memberships = await db
    .select()
    .from(communityGroupMembers)
    .where(
      and(
        eq(communityGroupMembers.userId, session.userId),
        groupIds.length > 0 ? inArray(communityGroupMembers.groupId, groupIds) : undefined,
      ),
    );

  const membershipMap = new Map(memberships.map((m) => [m.groupId, m.role]));

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    centreName: g.centreName,
    memberCount: countMap.get(g.id) ?? 0,
    joined: membershipMap.has(g.id),
    role: membershipMap.get(g.id) ?? null,
  }));
}

export async function getServiceAgreements(session: SessionPayload): Promise<AgreementRow[]> {
  const scope = centreScope(session);

  const rows = await db
    .select({
      id: serviceAgreements.id,
      title: serviceAgreements.title,
      status: serviceAgreements.status,
      partnerName: partners.name,
      centreName: centres.name,
      startsAt: serviceAgreements.startsAt,
    })
    .from(serviceAgreements)
    .innerJoin(partners, eq(serviceAgreements.partnerId, partners.id))
    .leftJoin(centres, eq(serviceAgreements.centreId, centres.id))
    .where(
      and(
        eq(serviceAgreements.organisationId, session.organisationId),
        scope?.length
          ? or(isNull(serviceAgreements.centreId), inArray(serviceAgreements.centreId, scope))
          : undefined,
      ),
    )
    .orderBy(desc(serviceAgreements.updatedAt));

  const agreementIds = rows.map((r) => r.id);
  const pendingReviews =
    agreementIds.length > 0
      ? await db
          .select()
          .from(agreementMonthlyReviews)
          .where(
            and(
              inArray(agreementMonthlyReviews.agreementId, agreementIds),
              eq(agreementMonthlyReviews.status, "pending"),
            ),
          )
      : [];

  const pendingMap = new Map(pendingReviews.map((r) => [r.agreementId, r.periodLabel]));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    partnerName: r.partnerName,
    centreName: r.centreName,
    startsAt: r.startsAt,
    pendingReviewPeriod: pendingMap.get(r.id) ?? null,
  }));
}

export async function getModerationQueue(session: SessionPayload): Promise<ModerationReportRow[]> {
  const rows = await db
    .select({
      id: messageReports.id,
      reason: messageReports.reason,
      status: messageReports.status,
      resolution: messageReports.resolution,
      createdAt: messageReports.createdAt,
      messageBody: messages.body,
      messageHidden: messages.hidden,
      reporterName: users.name,
      memberId: messages.memberId,
    })
    .from(messageReports)
    .innerJoin(messages, eq(messageReports.messageId, messages.id))
    .innerJoin(users, eq(messageReports.reporterId, users.id))
    .where(eq(messageReports.organisationId, session.organisationId))
    .orderBy(desc(messageReports.createdAt))
    .limit(50);

  const memberIds = [...new Set(rows.map((r) => r.memberId))];
  const memberRows =
    memberIds.length > 0
      ? await db.select().from(members).where(inArray(members.id, memberIds))
      : [];
  const memberMap = new Map(memberRows.map((m) => [m.id, m.name]));

  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.createdAt,
    messageBody: r.messageBody,
    messageHidden: r.messageHidden,
    reporterName: r.reporterName,
    memberName: memberMap.get(r.memberId) ?? "Member",
  }));
}

export async function getModerationStats(session: SessionPayload) {
  const rows = await db
    .select({
      status: messageReports.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(messageReports)
    .where(eq(messageReports.organisationId, session.organisationId))
    .groupBy(messageReports.status);

  const map = new Map(rows.map((r) => [r.status, r.count]));
  return {
    pending: map.get("pending") ?? 0,
    escalated: map.get("escalated") ?? 0,
    resolved: (map.get("dismissed") ?? 0) + (map.get("action_taken") ?? 0),
  };
}

export function defaultReviewPeriod() {
  return currentPeriodLabel();
}
