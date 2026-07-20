CREATE TABLE "item_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"reporter_id" text,
	"reason" text NOT NULL,
	"comment" text,
	"status" text DEFAULT 'open' NOT NULL,
	"flagged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_reports" ADD CONSTRAINT "item_reports_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;