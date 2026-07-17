CREATE TABLE "lesson_items" (
	"lesson_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"position" real NOT NULL,
	CONSTRAINT "lesson_items_lesson_id_item_id_pk" PRIMARY KEY("lesson_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"position" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_items" ADD CONSTRAINT "lesson_items_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_items" ADD CONSTRAINT "lesson_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;