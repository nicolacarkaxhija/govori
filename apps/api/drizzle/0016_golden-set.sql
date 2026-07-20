CREATE TABLE "golden_audits" (
	"item_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"accuracy" integer NOT NULL,
	"naturalness" integer NOT NULL,
	"fit" integer NOT NULL,
	"comment" text,
	"audited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "golden_audits_item_id_reviewer_id_pk" PRIMARY KEY("item_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "golden_sample" (
	"direction" text NOT NULL,
	"item_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "golden_sample_direction_item_id_pk" PRIMARY KEY("direction","item_id")
);
--> statement-breakpoint
ALTER TABLE "golden_audits" ADD CONSTRAINT "golden_audits_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "golden_sample" ADD CONSTRAINT "golden_sample_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;