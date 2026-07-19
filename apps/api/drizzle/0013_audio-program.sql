CREATE TABLE "audio_credits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"seconds_validated" integer DEFAULT 0 NOT NULL,
	"premium_days_granted" integer DEFAULT 0 NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataset_manifests" (
	"version" text PRIMARY KEY NOT NULL,
	"recording_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recording_votes" (
	"recording_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"up" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recording_votes_recording_id_voter_id_pk" PRIMARY KEY("recording_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "direction" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "speaker_pseudonym" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "accent_tag" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "device_meta" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_app" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_dataset" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_training" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recording_votes" ADD CONSTRAINT "recording_votes_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;