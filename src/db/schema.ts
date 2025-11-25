import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Clothing items table - catalog of all clothing/accessories
export const clothingItems = pgTable("clothing_items", {
  id: serial("id").primaryKey(),

  // Core identity
  title: varchar("title", { length: 255 }).notNull(), // was "name"
  displayTitle: varchar("display_title", { length: 100 }), // AI-generated short title (5 words or less)
  brand: varchar("brand", { length: 255 }), // e.g. "Amazon Essentials"

  // Basic categorization
  category: varchar("category", { length: 100 }), // "leggings", "shirt", "jacket"
  subcategory: varchar("subcategory", { length: 100 }), // "ponte legging", "crop top"
  color: varchar("color", { length: 100 }),
  material: varchar("material", { length: 255 }), // "Rayon/Nylon/Spandex"

  // Descriptive text (good for embeddings)
  description: text("description"),

  // Commerce info
  price: decimal("price", { precision: 10, scale: 2 }),
  productUrl: text("product_url"),
  imageUrl: text("image_url"),

  // Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
  embedding: vector("embedding", { dimensions: 384 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Outfits table - outfit combinations
export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(), // URL-friendly identifier (will be set to notNull after backfill)
  description: text("description"),
  occasion: varchar("occasion", { length: 100 }), // e.g., 'casual', 'formal', 'work', 'date'
  season: varchar("season", { length: 50 }), // e.g., 'spring', 'summer', 'fall', 'winter'
  imageUrl: text("image_url"), // generated collage photo
  inspirationPhotoUrl: text("inspiration_photo_url"), // original inspiration/costume photo
  collageMetadata: text("collage_metadata"), // JSON with bounding boxes for clickable products
  fromBulkUrl: text("from_bulk_url"), // CostumeWall URL used for bulk import (if applicable)

  // Status: 0 = pending/draft, 1 = approved, 2 = rejected
  status: integer("status").notNull().default(0),

  // Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
  embedding: vector("embedding", { dimensions: 384 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Junction table for many-to-many relationship between outfits and clothing items
export const outfitItems = pgTable("outfit_items", {
  id: serial("id").primaryKey(),
  outfitId: integer("outfit_id")
    .references(() => outfits.id, { onDelete: "cascade" })
    .notNull(),
  clothingItemId: integer("clothing_item_id")
    .references(() => clothingItems.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Missing products table - tracks unavailable products from bulk imports
export const missingProducts = pgTable("missing_products", {
  id: serial("id").primaryKey(),
  outfitId: integer("outfit_id")
    .references(() => outfits.id, { onDelete: "cascade" })
    .notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  originalAmazonUrl: text("original_amazon_url").notNull(),
  replacementUrl: text("replacement_url"),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const outfitsRelations = relations(outfits, ({ many }) => ({
  outfitItems: many(outfitItems),
  missingProducts: many(missingProducts),
}));

export const clothingItemsRelations = relations(clothingItems, ({ many }) => ({
  outfitItems: many(outfitItems),
}));

export const outfitItemsRelations = relations(outfitItems, ({ one }) => ({
  outfit: one(outfits, {
    fields: [outfitItems.outfitId],
    references: [outfits.id],
  }),
  clothingItem: one(clothingItems, {
    fields: [outfitItems.clothingItemId],
    references: [clothingItems.id],
  }),
}));

export const missingProductsRelations = relations(missingProducts, ({ one }) => ({
  outfit: one(outfits, {
    fields: [missingProducts.outfitId],
    references: [outfits.id],
  }),
}));
