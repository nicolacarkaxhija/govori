CREATE TABLE "entitlements" (
	"user_id" text NOT NULL,
	"sku" text NOT NULL,
	"source" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_user_id_sku_pk" PRIMARY KEY("user_id","sku")
);
