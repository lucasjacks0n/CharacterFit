// MUST load env vars before any other imports
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env") });

import { db } from "../src/db";
import { clothingItems, outfitItems } from "../src/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { normalizeAmazonUrl } from "../src/lib/amazon-url-utils";

async function normalizeAndDedupeProducts() {
  console.log("Starting product URL normalization and deduplication...\n");

  try {
    // Step 1: Normalize all existing product URLs
    console.log("Step 1: Normalizing all product URLs...\n");

    const allItems = await db.select().from(clothingItems);
    console.log(`Found ${allItems.length} total products\n`);

    let normalizedCount = 0;

    for (const item of allItems) {
      if (!item.productUrl) continue;

      const normalizedUrl = normalizeAmazonUrl(item.productUrl);

      if (normalizedUrl !== item.productUrl) {
        console.log(`Normalizing item ${item.id}:`);
        console.log(`  Old: ${item.productUrl}`);
        console.log(`  New: ${normalizedUrl}`);

        await db
          .update(clothingItems)
          .set({ productUrl: normalizedUrl })
          .where(eq(clothingItems.id, item.id));

        normalizedCount++;
      }
    }

    console.log(`\n✅ Normalized ${normalizedCount} product URLs\n`);

    // Step 2: Find duplicates (same productUrl)
    console.log("Step 2: Finding duplicate products...\n");

    const duplicates = await db
      .select({
        productUrl: clothingItems.productUrl,
        count: sql<number>`count(*)::int`,
        ids: sql<number[]>`array_agg(${clothingItems.id})`,
      })
      .from(clothingItems)
      .where(sql`${clothingItems.productUrl} IS NOT NULL`)
      .groupBy(clothingItems.productUrl)
      .having(sql`count(*) > 1`);

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!\n");
      return;
    }

    console.log(`Found ${duplicates.length} duplicate product URLs:\n`);

    let totalDuplicatesRemoved = 0;

    for (const dup of duplicates) {
      const ids = dup.ids as number[];
      console.log(`\nDuplicate: ${dup.productUrl}`);
      console.log(`  Found ${dup.count} copies with IDs: ${ids.join(", ")}`);

      // Keep the first one (lowest ID), delete the rest
      const [keepId, ...deleteIds] = ids.sort((a, b) => a - b);

      console.log(`  Keeping ID ${keepId}, deleting: ${deleteIds.join(", ")}`);

      // Check if any of the items to delete are used in outfits
      const usedInOutfits = await db
        .select({
          itemId: outfitItems.clothingItemId,
          outfitId: outfitItems.outfitId,
        })
        .from(outfitItems)
        .where(inArray(outfitItems.clothingItemId, deleteIds));

      if (usedInOutfits.length > 0) {
        console.log(`  ⚠️  Some items are used in outfits, reassigning to kept item...`);

        // Update outfit_items to point to the kept item instead
        for (const deleteId of deleteIds) {
          await db
            .update(outfitItems)
            .set({ clothingItemId: keepId })
            .where(eq(outfitItems.clothingItemId, deleteId));
        }

        console.log(`  ✅ Reassigned outfit references`);
      }

      // Now delete the duplicate items
      await db.delete(clothingItems).where(inArray(clothingItems.id, deleteIds));

      console.log(`  ✅ Deleted ${deleteIds.length} duplicate(s)`);
      totalDuplicatesRemoved += deleteIds.length;
    }

    console.log("\n" + "=".repeat(50));
    console.log("Summary:");
    console.log("=".repeat(50));
    console.log(`URLs normalized: ${normalizedCount}`);
    console.log(`Duplicate product URLs found: ${duplicates.length}`);
    console.log(`Duplicate items removed: ${totalDuplicatesRemoved}`);
    console.log("=".repeat(50) + "\n");
    console.log("🎉 Normalization and deduplication complete!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
normalizeAndDedupeProducts()
  .then(() => {
    console.log("\nScript complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
