CREATE TYPE "public"."wearable_source" AS ENUM('whoop', 'oura', 'ring', 'manual');--> statement-breakpoint
CREATE TYPE "public"."coach_question_status" AS ENUM('open', 'answered');--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "goal_target_sessions" integer;--> statement-breakpoint
CREATE TABLE "member_daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"calories" integer,
	"daily_report" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_vacations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"starts_at" date NOT NULL,
	"ends_at" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_wearables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"source" "wearable_source" DEFAULT 'manual' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovery" integer,
	"sleep_hours" integer,
	"strain" integer,
	"hrv" integer,
	"steps" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_coach_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"trainer_id" uuid,
	"question" text NOT NULL,
	"answer" text,
	"status" "coach_question_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "member_daily_logs" ADD CONSTRAINT "member_daily_logs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_daily_logs" ADD CONSTRAINT "member_daily_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_vacations" ADD CONSTRAINT "member_vacations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_vacations" ADD CONSTRAINT "member_vacations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wearables" ADD CONSTRAINT "member_wearables_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wearables" ADD CONSTRAINT "member_wearables_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coach_questions" ADD CONSTRAINT "member_coach_questions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coach_questions" ADD CONSTRAINT "member_coach_questions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coach_questions" ADD CONSTRAINT "member_coach_questions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_daily_logs_member_idx" ON "member_daily_logs" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_daily_logs_day_idx" ON "member_daily_logs" USING btree ("member_id","log_date");--> statement-breakpoint
CREATE INDEX "member_vacations_member_idx" ON "member_vacations" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_wearables_member_idx" ON "member_wearables" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_coach_questions_member_idx" ON "member_coach_questions" USING btree ("member_id");