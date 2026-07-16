CREATE TABLE "contrastive_notes" (
	"item_id" uuid NOT NULL,
	"source_lang" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "contrastive_notes_item_id_source_lang_text_pk" PRIMARY KEY("item_id","source_lang","text")
);
--> statement-breakpoint
CREATE TABLE "flag_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag_states" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"provenance" jsonb NOT NULL,
	"audit" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"item_id" uuid NOT NULL,
	"lang" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "translations_item_id_lang_text_pk" PRIMARY KEY("item_id","lang","text")
);
--> statement-breakpoint
ALTER TABLE "contrastive_notes" ADD CONSTRAINT "contrastive_notes_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;