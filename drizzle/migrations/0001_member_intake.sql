CREATE TYPE "public"."member_gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "gender" "member_gender";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "id_document_key" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "id_document_filename" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "intake_feedback" text;