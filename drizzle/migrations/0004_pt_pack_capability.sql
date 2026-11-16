ALTER TYPE "public"."plan_status" ADD VALUE IF NOT EXISTS 'paused';--> statement-breakpoint
ALTER TABLE "member_plans" ADD COLUMN "trainer_id" uuid;--> statement-breakpoint
ALTER TABLE "member_plans" ADD COLUMN "training_days" text;--> statement-breakpoint
ALTER TABLE "member_plans" ADD COLUMN "training_time" text;--> statement-breakpoint
ALTER TABLE "member_plans" ADD COLUMN "validity_months" integer;--> statement-breakpoint
ALTER TABLE "member_plans" ADD CONSTRAINT "member_plans_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "intake_data" jsonb;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "capability_score" integer;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "capability_profile" jsonb;