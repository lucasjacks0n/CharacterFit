// MUST load env vars before any other imports
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env") });

import { db } from "../src/db";
import { clothingItems } from "../src/db/schema";
import { eq, isNotNull, or, like } from "drizzle-orm";
import { downloadAndUploadImage } from "../src/lib/google-storage";

async function migrateProductImages() {
  console.log("Starting product image migration to Google Cloud Storage...\n");

  try {
    // Get all items with image URLs that are NOT already in GCS
    const items = await db
      .select()
      .from(clothingItems)
      .where(
        or(
          like(clothingItems.imageUrl, "%amazon.com%"),
          like(clothingItems.imageUrl, "%ssl-images-amazon.com%"),
          like(clothingItems.imageUrl, "%m.media-amazon.com%")
        )
      );

    console.log(`Found ${items.length} items with Amazon image URLs to migrate\n`);

    if (items.length === 0) {
      console.log("No items to migrate!");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(
        `[${i + 1}/${items.length}] Processing item ${item.id}: ${item.title}`
      );

      if (!item.imageUrl) {
        console.log(`  ⏭️  Skipped - no image URL\n`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`  📥 Downloading from: ${item.imageUrl.substring(0, 80)}...`);

        // Determine file extension from URL
        const extension = item.imageUrl.toLowerCase().includes(".png")
          ? "png"
          : "jpg";

        // Upload to GCS with the item ID in the filename
        const destinationPath = `product-images/item-${item.id}.${extension}`;
        const gcsUrl = await downloadAndUploadImage(item.imageUrl, destinationPath);

        // Update database with new GCS URL
        await db
          .update(clothingItems)
          .set({ imageUrl: gcsUrl })
          .where(eq(clothingItems.id, item.id));

        console.log(`  ✅ Uploaded to: ${gcsUrl}`);
        console.log(`  💾 Database updated\n`);
        successCount++;
      } catch (error) {
        console.error(
          `  ❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`
        );
        failCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Migration Summary:");
    console.log("=".repeat(50));
    console.log(`Total items processed: ${items.length}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏭️  Skipped (no URL): ${skippedCount}`);
    console.log("=".repeat(50) + "\n");

    if (failCount > 0) {
      console.log(
        "⚠️  Some items failed to migrate. You may want to review and retry them."
      );
    } else if (successCount > 0) {
      console.log("🎉 All items migrated successfully!");
    }
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateProductImages()
  .then(() => {
    console.log("\nMigration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
