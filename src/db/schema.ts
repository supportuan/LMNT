import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["active", "invited", "disabled"]);
export const orgStatusEnum = pgEnum("org_status", ["active", "suspended"]);
export const centreStatusEnum = pgEnum("centre_status", ["active", "inactive"]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "revoked",
]);
export const roleEnum = pgEnum("app_role", [
  "admin",
  "centre_manager",
  "trainer",
  "client",
]);
export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "consultation",
  "trial",
  "won",
  "lost",
]);
export const memberStatusEnum = pgEnum("member_status", ["active", "paused", "expired"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "cancelled", "expired"]);
export const assessmentStatusEnum = pgEnum("assessment_status", [
  "draft",
  "in_progress",
  "completed",
  "referred",
]);
export const programmeStatusEnum = pgEnum("programme_status", [
  "draft",
  "active",
  "completed",
  "paused",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);
export const attendanceMethodEnum = pgEnum("attendance_method", [
  "manual",
  "qr",
  "selfie_gps",
]);
export const assetStatusEnum = pgEnum("asset_status", ["operational", "down", "maintenance"]);
export const workRequestPriorityEnum = pgEnum("work_request_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const workRequestStatusEnum = pgEnum("work_request_status", [
  "submitted",
  "approved",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
]);
export const automationRuleTypeEnum = pgEnum("automation_rule_type", [
  "asset_maintenance_due",
  "inventory_low",
  "hygiene_weekly",
]);
export const coachMatchStatusEnum = pgEnum("coach_match_status", [
  "saved",
  "passed",
  "requested",
  "matched",
  "declined",
]);
export const meetingTypeEnum = pgEnum("meeting_type", ["consultation", "trial", "coffee"]);
export const partnerCategoryEnum = pgEnum("partner_category", [
  "nutrition",
  "physio",
  "apparel",
  "wellness",
  "other",
]);
export const serviceAgreementStatusEnum = pgEnum("service_agreement_status", [
  "draft",
  "active",
  "paused",
  "terminated",
]);
export const agreementReviewStatusEnum = pgEnum("agreement_review_status", [
  "pending",
  "submitted",
  "approved",
]);
export const messageReportStatusEnum = pgEnum("message_report_status", [
  "pending",
  "dismissed",
  "action_taken",
  "escalated",
]);
export const communityGroupRoleEnum = pgEnum("community_group_role", ["member", "moderator", "owner"]);
export const aiRecommendationTypeEnum = pgEnum("ai_recommendation_type", [
  "coach_suggestions",
  "workout_plan",
]);
export const aiRecommendationStatusEnum = pgEnum("ai_recommendation_status", [
  "generated",
  "accepted",
  "overridden",
  "rejected",
]);
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "pending",
  "in_progress",
  "completed",
]);
export const scheduleBlockTypeEnum = pgEnum("schedule_block_type", [
  "client",
  "deep_work",
  "admin",
  "life",
  "shutdown",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "other",
]);

export const organisations = pgTable("organisations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: orgStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const centres = pgTable(
  "centres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    capacity: integer("capacity").notNull().default(250),
    status: centreStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("centres_org_slug_idx").on(table.organisationId, table.slug),
    index("centres_org_idx").on(table.organisationId),
  ],
);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: userStatusEnum("status").notNull().default("active"),
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("org_membership_user_org_idx").on(table.userId, table.organisationId),
  ],
);

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("role_assignments_user_org_idx").on(table.userId, table.organisationId),
    index("role_assignments_centre_idx").on(table.centreId),
  ],
);

export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    actorRole: roleEnum("actor_role"),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_org_idx").on(table.organisationId),
    index("audit_created_idx").on(table.createdAt),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    correlationId: uuid("correlation_id"),
    actorId: uuid("actor_id").references(() => users.id),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    version: text("version").notNull().default("1"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("outbox_org_idx").on(table.organisationId),
    index("outbox_unpublished_idx").on(table.publishedAt),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: text("source").notNull().default("walk_in"),
    stage: leadStageEnum("stage").notNull().default("new"),
    notes: text("notes"),
    nextAction: text("next_action"),
    convertedMemberId: uuid("converted_member_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_org_centre_idx").on(table.organisationId, table.centreId),
    index("leads_owner_idx").on(table.ownerId),
  ],
);

export const consultationReports = pgTable(
  "consultation_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    prospectName: text("prospect_name").notNull(),
    lifeStage: text("life_stage"),
    goal: text("goal"),
    priceDiscussed: text("price_discussed"),
    transcript: text("transcript").notNull(),
    totalScore: integer("total_score").notNull(),
    scores: jsonb("scores").$type<Record<string, number>>().notNull(),
    speakerStats: jsonb("speaker_stats").$type<{ coach: number; client: number; labelled: boolean }>().notNull(),
    questionCount: integer("question_count").notNull().default(0),
    openQuestionCount: integer("open_question_count").notNull().default(0),
    objections: jsonb("objections").$type<string[]>().default([]),
    buyingSignals: jsonb("buying_signals").$type<string[]>().default([]),
    persona: text("persona"),
    diagnosis: text("diagnosis"),
    followupMessage: text("followup_message"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("consultation_reports_trainer_idx").on(table.trainerId),
    index("consultation_reports_lead_idx").on(table.leadId),
  ],
);

export const orgPackages = pgTable(
  "org_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sessionCount: integer("session_count").notNull().default(12),
    priceInr: integer("price_inr").notNull(),
    trainerShareBps: integer("trainer_share_bps").notNull().default(5000),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("org_packages_org_idx").on(table.organisationId)],
);

export const allocationDecisions = pgTable("allocation_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  centreId: uuid("centre_id")
    .notNull()
    .references(() => centres.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  ruleVersion: text("rule_version").notNull().default("v1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    status: memberStatusEnum("status").notNull().default("active"),
    goal: text("goal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("members_org_centre_idx").on(table.organisationId, table.centreId),
    index("members_user_idx").on(table.userId),
  ],
);

export const consentTypeEnum = pgEnum("consent_type", [
  "health",
  "transcript",
  "selfie",
  "gps",
  "credential",
  "communication",
]);

export const memberConsents = pgTable(
  "member_consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    granted: boolean("granted").notNull().default(false),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_consent_type_idx").on(table.memberId, table.consentType),
    index("member_consents_org_idx").on(table.organisationId),
  ],
);

export const memberPlans = pgTable("member_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  centreId: uuid("centre_id")
    .notNull()
    .references(() => centres.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  status: planStatusEnum("status").notNull().default("active"),
  totalSessions: integer("total_sessions").notNull().default(12),
  sessionsRemaining: integer("sessions_remaining").notNull().default(12),
  packageValue: integer("package_value").notNull().default(0),
  amountDue: integer("amount_due").notNull().default(0),
  trainerShareBps: integer("trainer_share_bps").notNull().default(5000),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coachingRelationships = pgTable(
  "coaching_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id),
    active: boolean("active").notNull().default(true),
    needsFollowUp: boolean("needs_follow_up").notNull().default(false),
    source: text("source").notNull().default("manual"),
    matchStatus: text("match_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("coaching_rel_member_idx").on(table.memberId),
    index("coaching_rel_trainer_idx").on(table.trainerId),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id),
    userId: uuid("user_id").references(() => users.id),
    method: attendanceMethodEnum("method").notNull().default("manual"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
  },
  (table) => [index("attendance_org_centre_idx").on(table.organisationId, table.centreId)],
);

export const coachShifts = pgTable("coach_shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  centreId: uuid("centre_id")
    .notNull()
    .references(() => centres.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id")
    .notNull()
    .references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  evidence: jsonb("evidence").$type<Record<string, unknown>>(),
});

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    status: assessmentStatusEnum("status").notNull().default("draft"),
    parqCleared: boolean("parq_cleared").notNull().default(false),
    referralRequired: boolean("referral_required").notNull().default(false),
    scores: jsonb("scores").$type<Record<string, number>>(),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assessments_member_idx").on(table.memberId)],
);

export const programmes = pgTable(
  "programmes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    title: text("title").notNull(),
    status: programmeStatusEnum("status").notNull().default("draft"),
    content: jsonb("content").$type<{
      markdown?: string;
      weeks?: {
        week: number;
        label: string;
        days: {
          key: string;
          label: string;
          exercises: {
            id: string;
            name: string;
            pattern: string;
            prescription: string;
            targetReps: string;
          }[];
        }[];
      }[];
      goal?: string;
      daysPerWeek?: number;
    }>(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("programmes_member_idx").on(table.memberId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    programmeId: uuid("programme_id").references(() => programmes.id),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    readinessScore: integer("readiness_score"),
    painFlag: boolean("pain_flag").notNull().default(false),
    rpe: integer("rpe"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_org_centre_idx").on(table.organisationId, table.centreId),
    index("sessions_member_idx").on(table.memberId),
  ],
);

export const sessionFeedback = pgTable("session_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  centreId: uuid("centre_id")
    .notNull()
    .references(() => centres.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  memberScore: integer("member_score"),
  coachScore: integer("coach_score"),
  energy: text("energy"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nutritionPlans = pgTable(
  "nutrition_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    calories: integer("calories"),
    protein: integer("protein"),
    carbs: integer("carbs"),
    fat: integer("fat"),
    dietPreference: text("diet_preference"),
    mealStructure: text("meal_structure"),
    mealTiming: text("meal_timing"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("nutrition_member_idx").on(table.memberId)],
);

export const coachNotes = pgTable(
  "coach_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("coach_notes_member_idx").on(table.memberId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_member_idx").on(table.memberId)],
);

export const clientCheckIns = pgTable(
  "client_check_ins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    sleep: text("sleep"),
    energy: text("energy"),
    nutritionAdherence: text("nutrition_adherence"),
    trainingAdherence: text("training_adherence"),
    painDiscomfort: text("pain_discomfort"),
    clientComment: text("client_comment"),
    trainerResponse: text("trainer_response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("check_ins_member_idx").on(table.memberId)],
);

export const sessionExerciseLogs = pgTable(
  "session_exercise_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    movementPattern: text("movement_pattern"),
    targetPrescription: text("target_prescription"),
    load: text("load"),
    reps: text("reps"),
    rpe: integer("rpe"),
    progressionTag: text("progression_tag"),
    status: text("status").notNull().default("completed"),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("session_exercise_logs_session_idx").on(table.sessionId)],
);

export const progressSnapshots = pgTable(
  "progress_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id").references(() => users.id),
    weight: integer("weight"),
    bodyFat: integer("body_fat"),
    measurements: jsonb("measurements").$type<Record<string, number>>(),
    performanceMetrics: jsonb("performance_metrics").$type<Record<string, number>>(),
    photos: jsonb("photos").$type<string[]>().default([]),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("progress_snapshots_member_idx").on(table.memberId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    triggerEvent: text("trigger_event"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tasks_owner_idx").on(table.ownerId)],
);

export const trainerSettings = pgTable(
  "trainer_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    maxConsecutiveSessions: integer("max_consecutive_sessions").notNull().default(4),
    trainingDays: text("training_days").default("Mon, Wed, Fri"),
    trainingTime: text("training_time").default("3–4pm"),
    mealWindow: text("meal_window").default("1–2pm"),
    lifeNotes: text("life_notes"),
    top3: jsonb("top3").$type<string[]>().default(["Deliver great sessions", "One career-building task", "Protect recovery time"]),
    nonNegotiables: jsonb("non_negotiables").$type<{ label: string; done: boolean }[]>().default([]),
    notifications: jsonb("notifications")
      .$type<{ sessionReminders: boolean; clientUpdates: boolean; emailDigest: boolean }>()
      .default({ sessionReminders: true, clientUpdates: true, emailDigest: false }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("trainer_settings_user_org_idx").on(table.userId, table.organisationId)],
);

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    timeSlot: text("time_slot").notNull(),
    blockType: scheduleBlockTypeEnum("block_type").notNull().default("client"),
    label: text("label").notNull(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("schedule_blocks_trainer_idx").on(table.trainerId),
    uniqueIndex("schedule_blocks_slot_idx").on(
      table.trainerId,
      table.dayOfWeek,
      table.timeSlot,
    ),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("equipment"),
    serialNumber: text("serial_number"),
    location: text("location"),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    purchaseCost: integer("purchase_cost"),
    status: assetStatusEnum("status").notNull().default("operational"),
    assignedTrainerId: uuid("assigned_trainer_id").references(() => users.id, { onDelete: "set null" }),
    assignedArea: text("assigned_area"),
    warrantyUntil: timestamp("warranty_until", { withTimezone: true }),
    lastServiceAt: timestamp("last_service_at", { withTimezone: true }),
    nextMaintenanceAt: timestamp("next_maintenance_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assets_centre_idx").on(table.centreId)],
);

export const workRequests = pgTable(
  "work_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: workRequestPriorityEnum("priority").notNull().default("normal"),
    status: workRequestStatusEnum("status").notNull().default("submitted"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("work_requests_centre_idx").on(table.centreId),
    index("work_requests_status_idx").on(table.status),
    index("work_requests_sla_idx").on(table.slaDueAt),
  ],
);

export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ruleType: automationRuleTypeEnum("rule_type").notNull(),
    cadenceDays: integer("cadence_days").notNull().default(1),
    taskTitle: text("task_title").notNull(),
    taskDescription: text("task_description"),
    ownerRole: roleEnum("owner_role").notNull().default("centre_manager"),
    active: boolean("active").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("automation_rules_org_centre_idx").on(table.organisationId, table.centreId)],
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku"),
    quantity: integer("quantity").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(5),
    unit: text("unit").notNull().default("units"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inventory_centre_idx").on(table.centreId)],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => memberPlans.id, { onDelete: "set null" }),
    amountInr: integer("amount_inr").notNull(),
    method: paymentMethodEnum("method").notNull().default("upi"),
    recordedBy: uuid("recorded_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_records_member_idx").on(table.memberId),
    index("payment_records_plan_idx").on(table.planId),
  ],
);

export const coachMatchInteractions = pgTable(
  "coach_match_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: coachMatchStatusEnum("status").notNull().default("saved"),
    matchScore: integer("match_score"),
    matchReasons: jsonb("match_reasons").$type<string[]>().default([]),
    meetingType: meetingTypeEnum("meeting_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coach_match_member_trainer_idx").on(table.memberId, table.trainerId),
    index("coach_match_member_idx").on(table.memberId),
  ],
);

export const trainerCredentials = pgTable(
  "trainer_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    issuer: text("issuer"),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trainer_credentials_trainer_idx").on(table.trainerId)],
);

export const partners = pgTable(
  "partners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    category: partnerCategoryEnum("category").notNull().default("other"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    description: text("description"),
    commissionBps: integer("commission_bps").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("partners_org_idx").on(table.organisationId)],
);

export const partnerOffers = pgTable(
  "partner_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    memberPriceInr: integer("member_price_inr"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("partner_offers_partner_idx").on(table.partnerId)],
);

export const communityGroups = pgTable(
  "community_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("community_groups_org_idx").on(table.organisationId)],
);

export const communityGroupMembers = pgTable(
  "community_group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => communityGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: communityGroupRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("community_group_member_idx").on(table.groupId, table.userId),
    index("community_group_members_user_idx").on(table.userId),
  ],
);

export const serviceAgreements = pgTable(
  "service_agreements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    terms: text("terms"),
    status: serviceAgreementStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("service_agreements_org_idx").on(table.organisationId),
    index("service_agreements_partner_idx").on(table.partnerId),
  ],
);

export const agreementMonthlyReviews = pgTable(
  "agreement_monthly_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => serviceAgreements.id, { onDelete: "cascade" }),
    periodLabel: text("period_label").notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().default({}),
    summary: text("summary"),
    status: agreementReviewStatusEnum("status").notNull().default("pending"),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agreement_review_period_idx").on(table.agreementId, table.periodLabel),
    index("agreement_reviews_agreement_idx").on(table.agreementId),
  ],
);

export const messageReports = pgTable(
  "message_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: messageReportStatusEnum("status").notNull().default("pending"),
    resolution: text("resolution"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("message_reports_status_idx").on(table.status),
    index("message_reports_message_idx").on(table.messageId),
  ],
);

export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: aiRecommendationTypeEnum("type").notNull(),
    status: aiRecommendationStatusEnum("status").notNull().default("generated"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb("output").$type<Record<string, unknown>>().notNull().default({}),
    explanation: jsonb("explanation")
      .$type<{
        reasons: string[];
        sources: { id: string; source: string; score: number }[];
        signals: { label: string; value: string }[];
        safetyFlags: string[];
      }>()
      .notNull()
      .default({ reasons: [], sources: [], signals: [], safetyFlags: [] }),
    overrideOutput: jsonb("override_output").$type<Record<string, unknown>>(),
    programmeId: uuid("programme_id").references(() => programmes.id, { onDelete: "set null" }),
    modelSource: text("model_source").notNull().default("fallback"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_recommendations_member_idx").on(table.memberId),
    index("ai_recommendations_trainer_idx").on(table.trainerId),
    index("ai_recommendations_status_idx").on(table.status),
  ],
);

export const trainerProfiles = pgTable(
  "trainer_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    bio: text("bio"),
    specialties: jsonb("specialties").$type<string[]>().default([]),
    sessionsPerWeek: text("sessions_per_week"),
    marketplaceVisible: boolean("marketplace_visible").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trainer_profiles_org_idx").on(table.organisationId)],
);

export const coachMirrorAssessments = pgTable(
  "coach_mirror_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id").references(() => centres.id, { onDelete: "set null" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileInput: jsonb("profile_input").$type<Record<string, unknown>>().notNull(),
    profileScores: jsonb("profile_scores").$type<Record<string, number>>().notNull(),
    overall: integer("overall").notNull(),
    headline: text("headline").notNull(),
    weakDomain: text("weak_domain"),
    pathway: jsonb("pathway").$type<[string, string][]>(),
    checklist: jsonb("checklist").$type<string[]>(),
    incomeSnapshot: jsonb("income_snapshot").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("coach_mirror_trainer_idx").on(table.trainerId),
    index("coach_mirror_org_idx").on(table.organisationId),
  ],
);

export const onboardingAssignments = pgTable(
  "onboarding_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    centreId: uuid("centre_id")
      .notNull()
      .references(() => centres.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => users.id),
    status: onboardingStatusEnum("status").notNull().default("pending"),
    checklist: jsonb("checklist").$type<{ item: string; done: boolean }[]>().notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("onboarding_trainer_idx").on(table.trainerId),
    index("onboarding_member_idx").on(table.memberId),
  ],
);

export type AppRole = (typeof roleEnum.enumValues)[number];

export type Organisation = typeof organisations.$inferSelect;
export type Centre = typeof centres.$inferSelect;
export type User = typeof users.$inferSelect;
export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type WorkRequest = typeof workRequests.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type CoachMatchInteraction = typeof coachMatchInteractions.$inferSelect;
export type TrainerCredential = typeof trainerCredentials.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type PartnerOffer = typeof partnerOffers.$inferSelect;
export type CommunityGroup = typeof communityGroups.$inferSelect;
export type ServiceAgreement = typeof serviceAgreements.$inferSelect;
export type AgreementMonthlyReview = typeof agreementMonthlyReviews.$inferSelect;
export type MessageReport = typeof messageReports.$inferSelect;
export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type MemberConsent = typeof memberConsents.$inferSelect;
