CREATE TABLE "clothing_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"brand" varchar(255),
	"category" varchar(100),
	"subcategory" varchar(100),
	"color" varchar(100),
	"material" varchar(255),
	"description" text,
	"price" numeric(10, 2),
	"product_url" text,
	"image_url" text,
	"embedding" vector(384),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "outfit_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"outfit_id" integer NOT NULL,
	"clothing_item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outfits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"occasion" varchar(100),
	"season" varchar(50),
	"image_url" text,
	"inspiration_photo_url" text,
	"collage_metadata" text,
	"from_bulk_url" text,
	"status" integer DEFAULT 0 NOT NULL,
	"embedding" vector(384),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "missing_products" ADD CONSTRAINT "missing_products_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_clothing_item_id_clothing_items_id_fk" FOREIGN KEY ("clothing_item_id") REFERENCES "public"."clothing_items"("id") ON DELETE cascade ON UPDATE no action;