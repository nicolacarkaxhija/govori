-- Direction scoping (ADR 0046). Nullable on purpose: static SQL cannot
-- know a deployment's directions, so the composition roots backfill
-- NULL rows with the instance's first direction id right after
-- migrating, and every adapter treats NULL as invalid from then on.
ALTER TABLE "items" ADD COLUMN "direction" text;--> statement-breakpoint
ALTER TABLE "review_queue" ADD COLUMN "direction" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "direction" text;
