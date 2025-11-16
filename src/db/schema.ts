import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Clothing items table - catalog of all clothing/accessories
export const clothingItems = pgTable("clothing_items", {
  id: serial("id").primaryKey(),

  // Core identity
  title: varchar("title", { length: 255 }).notNull(), // was "name"
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

  // For now you can store embeddings as JSON; later swap to pgvector
  // embedding: vector('embedding', { dimensions: 1536 }),
  embeddingJson: text("embedding_json"), // optional: JSON string of the embedding

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Outfits table - outfit combinations
export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  occasion: varchar("occasion", { length: 100 }), // e.g., 'casual', 'formal', 'work', 'date'
  season: varchar("season", { length: 50 }), // e.g., 'spring', 'summer', 'fall', 'winter'
  imageUrl: text("image_url"), // generated collage photo
  inspirationPhotoUrl: text("inspiration_photo_url"), // original inspiration/costume photo
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

// Relations
export const outfitsRelations = relations(outfits, ({ many }) => ({
  outfitItems: many(outfitItems),
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
