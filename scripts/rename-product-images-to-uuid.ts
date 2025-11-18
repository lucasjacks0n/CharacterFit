// MUST load env vars before any other imports
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env") });

import { db } from "../src/db";
import { clothingItems } from "../src/db/schema";
import { eq, like } from "drizzle-orm";
import { downloadAndUploadImage, deleteFromGoogleStorage } from "../src/lib/google-storage";
import { randomUUID } from "crypto";

async function renameProductImagesToUuid() {
  console.log("Starting product image renaming to UUIDs...\n");

  try {
    // Get all items with GCS image URLs (already migrated from Amazon)
    const items = await db
      .select()
      .from(clothingItems)
      .where(like(clothingItems.imageUrl, "%storage.googleapis.com%"));

    console.log(`Found ${items.length} items with GCS image URLs to rename\n`);

    if (items.length === 0) {
      console.log("No items to rename!");
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

      // Skip if already using UUID format (not item-*.jpg)
      if (!item.imageUrl.includes("/product-images/item-")) {
        console.log(`  ⏭️  Skipped - already using UUID format\n`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`  🔄 Current URL: ${item.imageUrl}`);

        // Generate a random UUID for the new filename
        const imageUuid = randomUUID();

        // Determine file extension from current URL
        const extension = item.imageUrl.toLowerCase().endsWith(".png")
          ? "png"
          : "jpg";

        const newDestinationPath = `product-images/${imageUuid}.${extension}`;

        // Download from current GCS location and re-upload with UUID filename
        const newGcsUrl = await downloadAndUploadImage(
          item.imageUrl,
          newDestinationPath
        );

        // Update database with new UUID-based URL
        await db
          .update(clothingItems)
          .set({ imageUrl: newGcsUrl })
          .where(eq(clothingItems.id, item.id));

        // Delete the old file from GCS
        try {
          const oldUrl = new URL(item.imageUrl);
          const oldPathParts = oldUrl.pathname.split('/');
          const oldGcsPath = oldPathParts.slice(2).join('/'); // Remove leading '/' and bucket name
          await deleteFromGoogleStorage(oldGcsPath);
          console.log(`  🗑️  Deleted old file`);
        } catch (deleteError) {
          console.error(`  ⚠️  Warning: Failed to delete old file:`, deleteError);
          // Continue anyway, new file is uploaded and DB is updated
        }

        console.log(`  ✅ New URL: ${newGcsUrl}`);
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
    console.log("Renaming Summary:");
    console.log("=".repeat(50));
    console.log(`Total items processed: ${items.length}`);
    console.log(`✅ Successfully renamed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log("=".repeat(50) + "\n");

    if (failCount > 0) {
      console.log(
        "⚠️  Some items failed to rename. You may want to review and retry them."
      );
    } else if (successCount > 0) {
      console.log("🎉 All items renamed successfully!");
    }
  } catch (error) {
    console.error("Fatal error during renaming:", error);
    process.exit(1);
  }
}

// Run the renaming
renameProductImagesToUuid()
  .then(() => {
    console.log("\nRenaming complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Renaming failed:", error);
    process.exit(1);
  });
