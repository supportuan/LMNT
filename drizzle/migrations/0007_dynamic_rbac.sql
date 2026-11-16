CREATE TYPE "public"."access_scope" AS ENUM('global', 'organisation', 'region', 'center', 'department', 'team', 'assigned', 'self');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "legacy_key" text,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organisation_id" uuid NOT NULL,
  "org_role_id" uuid NOT NULL,
  "permission" text NOT NULL,
  "scope" "access_scope" DEFAULT 'organisation' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "org_role_id" uuid;
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "starts_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "ends_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_organisation_id_organisations_id_fk"
    FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_role_permissions" ADD CONSTRAINT "org_role_permissions_organisation_id_organisations_id_fk"
    FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_role_permissions" ADD CONSTRAINT "org_role_permissions_org_role_id_org_roles_id_fk"
    FOREIGN KEY ("org_role_id") REFERENCES "public"."org_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_org_role_id_org_roles_id_fk"
    FOREIGN KEY ("org_role_id") REFERENCES "public"."org_roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_roles_org_name_idx" ON "org_roles" USING btree ("organisation_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_roles_org_legacy_idx" ON "org_roles" USING btree ("organisation_id","legacy_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_roles_org_idx" ON "org_roles" USING btree ("organisation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_role_perm_unique_idx" ON "org_role_permissions" USING btree ("org_role_id","permission");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_role_perm_role_idx" ON "org_role_permissions" USING btree ("org_role_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_role_perm_org_idx" ON "org_role_permissions" USING btree ("organisation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_assignments_org_role_idx" ON "role_assignments" USING btree ("org_role_id");
