ALTER TABLE "flag_audit" ADD COLUMN "target_role" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "flag_states" ADD COLUMN "target_role" text DEFAULT 'all' NOT NULL;