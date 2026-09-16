/** Canonical domain event types — published to outbox_events for async processing. */
export const DOMAIN_EVENT_TYPES = [
  "LeadCreated",
  "LeadAllocated",
  "LeadStageChanged",
  "LeadConverted",
  "ConsultationCompleted",
  "TrialCompleted",
  "MembershipExpiring",
  "MemberAtRisk",
  "MemberMissed7Days",
  "AssessmentCompleted",
  "ReferralRequired",
  "ProgrammeAssigned",
  "ProgrammePublished",
  "ProgressionDue",
  "SessionClosed",
  "LowFeedback",
  "PainFlagged",
  "TaskCreated",
  "TaskOverdue",
  "EquipmentDown",
  "RequestApproved",
  "WorkOrderClosed",
  "MatchCreated",
  "TaskCompleted",
  "PartnerCreated",
  "GroupCreated",
  "AgreementActivated",
  "AgreementReviewSubmitted",
  "MessageReported",
  "AiRecommendationGenerated",
  "AiRecommendationResolved",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type DomainEventPayload = {
  correlationId: string;
  version: string;
  timestamp: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  [key: string]: unknown;
};

export type PublishEventInput = {
  organisationId: string;
  type: DomainEventType;
  payload?: Record<string, unknown>;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
};
