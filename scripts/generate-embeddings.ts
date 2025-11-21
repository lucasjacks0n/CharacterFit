/**
 * Generate embeddings for clothing items and outfits using Transformers.js
 *
 * This script:
 * 1. Connects to the PostgreSQL database
 * 2. Fetches all clothing items and outfits without embeddings
 * 3. Generates embeddings using all-MiniLM-L6-v2 model (384 dimensions)
 * 4. Updates the database with the embeddings
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { pipeline } from "@xenova/transformers";
import { db } from "../src/db";
import { clothingItems, outfits } from "../src/db/schema";
import { isNull, sql } from "drizzle-orm";

// Initialize the embedding pipeline
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("Loading sentence-transformers model (all-MiniLM-L6-v2)...");
    console.log("(First run will download ~80MB model, then cached locally)");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("✓ Model loaded! Embedding dimensions: 384\n");
  }
  return embedder;
}

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  material: string | null;
  description: string | null;
}

interface Outfit {
  id: number;
  name: string;
  description: string | null;
  occasion: string | null;
  season: string | null;
  itemTitles: string[];
}

function createEmbeddingText(item: ClothingItem): string {
  /**Create embedding text from title only */
  return item.title || "";
}

function createOutfitEmbeddingText(outfit: Outfit): string {
  /**Create embedding text from name only */
  return outfit.name || "";
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  /**Generate embeddings for an array of texts */
  const embedder = await getEmbedder();

  // Generate embeddings
  const output = await embedder(texts, { pooling: "mean", normalize: true });

  // Convert to array of arrays
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    embeddings.push(Array.from(output[i].data));
  }

  return embeddings;
}

async function generateClothingItemsEmbeddings() {
  /**Generate and update embeddings for all clothing items */
  console.log("Generating embeddings for clothing items...");

  // Fetch all clothing items without embeddings
  const items = await db
    .select({
      id: clothingItems.id,
      title: clothingItems.title,
      brand: clothingItems.brand,
      category: clothingItems.category,
      subcategory: clothingItems.subcategory,
      color: clothingItems.color,
      material: clothingItems.material,
      description: clothingItems.description,
    })
    .from(clothingItems)
    .where(isNull(clothingItems.embedding));

  if (items.length === 0) {
    console.log("✓ All clothing items already have embeddings!\n");
    return;
  }

  console.log(`Found ${items.length} clothing items without embeddings`);

  // Process in batches for efficiency
  const batchSize = 32;
  let totalUpdated = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Create text representations
    const texts = batch.map((item) => createEmbeddingText(item));

    // Generate embeddings
    const embeddings = await generateEmbeddings(texts);

    // Update database
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const embedding = embeddings[j];

      // Format embedding as pgvector format: [0.1,0.2,...]
      const vectorString = `[${embedding.join(",")}]`;

      await db.execute(
        sql`UPDATE clothing_items SET embedding = ${vectorString}::vector WHERE id = ${item.id}`
      );

      totalUpdated++;
    }

    console.log(
      `  Processed ${Math.min(i + batchSize, items.length)}/${items.length} items...`
    );
  }

  console.log(`✓ Updated ${totalUpdated} clothing items with embeddings!\n`);
}

async function generateOutfitsEmbeddings() {
  /**Generate and update embeddings for all outfits */
  console.log("Generating embeddings for outfits...");

  // Fetch all outfits without embeddings, along with their clothing items
  const outfitsData = await db.execute(sql`
    SELECT
      o.id,
      o.name,
      o.description,
      o.occasion,
      o.season,
      COALESCE(
        array_agg(ci.title) FILTER (WHERE ci.title IS NOT NULL),
        ARRAY[]::varchar[]
      ) as item_titles
    FROM outfits o
    LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
    LEFT JOIN clothing_items ci ON oi.clothing_item_id = ci.id
    WHERE o.embedding IS NULL
    GROUP BY o.id, o.name, o.description, o.occasion, o.season
  `);

  const rows = (outfitsData as any).rows || (outfitsData as any) || [];

  if (rows.length === 0) {
    console.log("✓ All outfits already have embeddings!\n");
    return;
  }

  console.log(`Found ${rows.length} outfits without embeddings`);

  // Process in batches
  const batchSize = 32;
  let totalUpdated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    // Create text representations
    const texts = batch.map((row: any) => {
      const outfit: Outfit = {
        id: row.id,
        name: row.name,
        description: row.description,
        occasion: row.occasion,
        season: row.season,
        itemTitles: row.item_titles || [],
      };
      return createOutfitEmbeddingText(outfit);
    });

    // Generate embeddings
    const embeddings = await generateEmbeddings(texts);

    // Update database
    for (let j = 0; j < batch.length; j++) {
      const row: any = batch[j];
      const embedding = embeddings[j];

      // Format embedding as pgvector format: [0.1,0.2,...]
      const vectorString = `[${embedding.join(",")}]`;

      await db.execute(
        sql`UPDATE outfits SET embedding = ${vectorString}::vector WHERE id = ${row.id}`
      );

      totalUpdated++;
    }

    console.log(
      `  Processed ${Math.min(i + batchSize, rows.length)}/${
        rows.length
      } outfits...`
    );
  }

  console.log(`✓ Updated ${totalUpdated} outfits with embeddings!\n`);
}

async function main() {
  try {
    console.log("=".repeat(70));
    console.log("EMBEDDING GENERATION SCRIPT");
    console.log("=".repeat(70));
    console.log("");

    // Generate embeddings for clothing items
    await generateClothingItemsEmbeddings();

    // Generate embeddings for outfits
    await generateOutfitsEmbeddings();

    console.log("=".repeat(70));
    console.log("✅ ALL DONE! Embeddings generated successfully!");
    console.log("=".repeat(70));
    console.log("");
    console.log("Next steps:");
    console.log("1. Test the search API: GET /api/search?q=red+dress");
    console.log("2. Run this script again whenever you add new items/outfits");
    console.log("3. Consider calling the embedding generation from your API after creating items");
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
