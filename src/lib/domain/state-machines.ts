import {
  assessmentStatusEnum,
  leadStageEnum,
  sessionStatusEnum,
  taskStatusEnum,
  workRequestStatusEnum,
  serviceAgreementStatusEnum,
  agreementReviewStatusEnum,
  messageReportStatusEnum,
} from "@/db/schema";

type LeadStage = (typeof leadStageEnum.enumValues)[number];
type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];
type AssessmentStatus = (typeof assessmentStatusEnum.enumValues)[number];
type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
type WorkRequestStatus = (typeof workRequestStatusEnum.enumValues)[number];

const LEAD_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ["contacted", "lost"],
  contacted: ["consultation", "lost"],
  consultation: ["trial", "won", "lost"],
  trial: ["won", "lost"],
  won: [],
  lost: ["contacted"],
};

const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["scheduled"],
};

const ASSESSMENT_TRANSITIONS: Record<AssessmentStatus, AssessmentStatus[]> = {
  draft: ["in_progress", "referred"],
  in_progress: ["completed", "referred"],
  completed: [],
  referred: ["in_progress"],
};

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["open"],
};

export class InvalidStateTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} transition: ${from} → ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

function assertTransition<T extends string>(
  entity: string,
  from: T,
  to: T,
  map: Record<string, T[]>,
) {
  if (from === to) return;
  const allowed = map[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidStateTransitionError(entity, from, to);
  }
}

export function assertLeadTransition(from: LeadStage, to: LeadStage) {
  assertTransition("lead", from, to, LEAD_TRANSITIONS);
}

export function assertSessionTransition(from: SessionStatus, to: SessionStatus) {
  assertTransition("session", from, to, SESSION_TRANSITIONS);
}

export function assertAssessmentTransition(from: AssessmentStatus, to: AssessmentStatus) {
  assertTransition("assessment", from, to, ASSESSMENT_TRANSITIONS);
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus) {
  assertTransition("task", from, to, TASK_TRANSITIONS);
}

const WORK_REQUEST_TRANSITIONS: Record<WorkRequestStatus, WorkRequestStatus[]> = {
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function assertWorkRequestTransition(from: WorkRequestStatus, to: WorkRequestStatus) {
  assertTransition("work_request", from, to, WORK_REQUEST_TRANSITIONS);
}

/** Coaching relationship lifecycle — extend before adding a dedicated Match entity. */
export const MATCH_STATUSES = ["requested", "pending", "active", "ended"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  requested: ["pending", "ended"],
  pending: ["active", "ended"],
  active: ["ended"],
  ended: [],
};

export function assertMatchTransition(from: MatchStatus, to: MatchStatus) {
  assertTransition("match", from, to, MATCH_TRANSITIONS);
}

type AgreementStatus = (typeof serviceAgreementStatusEnum.enumValues)[number];
type ReviewStatus = (typeof agreementReviewStatusEnum.enumValues)[number];
type ReportStatus = (typeof messageReportStatusEnum.enumValues)[number];

const AGREEMENT_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  draft: ["active", "terminated"],
  active: ["paused", "terminated"],
  paused: ["active", "terminated"],
  terminated: [],
};

const REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ["submitted"],
  submitted: ["approved", "pending"],
  approved: [],
};

const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ["dismissed", "action_taken", "escalated"],
  escalated: ["dismissed", "action_taken"],
  dismissed: [],
  action_taken: [],
};

export function assertAgreementTransition(from: AgreementStatus, to: AgreementStatus) {
  assertTransition("service_agreement", from, to, AGREEMENT_TRANSITIONS);
}

export function assertReviewTransition(from: ReviewStatus, to: ReviewStatus) {
  assertTransition("agreement_review", from, to, REVIEW_TRANSITIONS);
}

export function assertReportTransition(from: ReportStatus, to: ReportStatus) {
  assertTransition("message_report", from, to, REPORT_TRANSITIONS);
}
