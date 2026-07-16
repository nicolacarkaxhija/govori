CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"grade" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;