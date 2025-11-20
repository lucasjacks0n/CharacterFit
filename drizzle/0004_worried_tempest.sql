CREATE TABLE "missing_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"outfit_id" integer NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"original_amazon_url" text NOT NULL,
	"replacement_url" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clothing_items" DROP CONSTRAINT "clothing_items_uuid_unique";--> statement-breakpoint
ALTER TABLE "missing_products" ADD CONSTRAINT "missing_products_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_items" DROP COLUMN "uuid";