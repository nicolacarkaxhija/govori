CREATE TABLE "review_votes" (
	"review_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"up" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_votes_review_id_voter_id_pk" PRIMARY KEY("review_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_review_queue_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review_queue"("id") ON DELETE cascade ON UPDATE no action;