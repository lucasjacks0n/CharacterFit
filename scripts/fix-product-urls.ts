#!/usr/bin/env npx tsx

/**
 * Script to normalize all product URLs in the database
 * Adds https:// to URLs that don't have a protocol
 */

import "dotenv/config";
import { db } from "../src/db";
import { clothingItems } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function fixProductUrls() {
  console.log("Starting to fix product URLs...\n");

  try {
    // Find all clothing items with product URLs
    const items = await db.select().from(clothingItems);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      // Skip if no product URL
      if (!item.productUrl) {
        continue;
      }

      // Check if URL already has protocol
      if (
        item.productUrl.startsWith("http://") ||
        item.productUrl.startsWith("https://")
      ) {
        skippedCount++;
        continue;
      }

      // URL needs fixing - add https://
      const normalizedUrl = `https://${item.productUrl}`;

      console.log(`Fixing item ${item.id}: ${item.title}`);
      console.log(`  Old URL: ${item.productUrl}`);
      console.log(`  New URL: ${normalizedUrl}`);

      // Update the database
      await db
        .update(clothingItems)
        .set({
          productUrl: normalizedUrl,
          updatedAt: new Date(),
        })
        .where(sql`${clothingItems.id} = ${item.id}`);

      fixedCount++;
    }

    console.log("\n✅ Done!");
    console.log(`Fixed: ${fixedCount} URLs`);
    console.log(`Skipped (already valid): ${skippedCount} URLs`);
    console.log(`Total items checked: ${items.length}`);
  } catch (error) {
    console.error("❌ Error fixing product URLs:", error);
    process.exit(1);
  }

  process.exit(0);
}

fixProductUrls();
