ALTER TABLE "clothing_items" ADD COLUMN "display_title" varchar(100);--> statement-breakpoint
ALTER TABLE "outfits" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_slug_unique" UNIQUE("slug");