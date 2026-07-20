ALTER TABLE "items" ADD COLUMN "attestation" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "difficulty" real;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "sense_group" integer;