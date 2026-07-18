CREATE TABLE "item_forms" (
	"item_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "item_forms_item_id_tag_text_pk" PRIMARY KEY("item_id","tag","text")
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "pos" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "pos_detail" text;--> statement-breakpoint
ALTER TABLE "item_forms" ADD CONSTRAINT "item_forms_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;