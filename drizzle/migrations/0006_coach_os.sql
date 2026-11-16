ALTER TABLE "trainer_settings" ADD COLUMN IF NOT EXISTS "checklist_date" text;
--> statement-breakpoint
ALTER TABLE "trainer_settings" ADD COLUMN IF NOT EXISTS "shutdown_time" text DEFAULT '10:00 PM';
--> statement-breakpoint
ALTER TABLE "trainer_settings" ADD COLUMN IF NOT EXISTS "weekly_review" jsonb;
