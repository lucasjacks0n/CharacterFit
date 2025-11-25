/**
 * Backfill script to generate slugs for all existing outfits using DeepSeek
 *
 * Run with: npx tsx scripts/backfill-outfit-slugs.ts
 */

import { db } from "../src/db";
import { outfits } from "../src/db/schema";
import { eq, isNull } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "../src/lib/deepseek";

async function main() {
  console.log("Starting outfit slug backfill...\n");

  // Fetch all outfits that don't have slugs yet
  const outfitsWithoutSlugs = await db
    .select({
      id: outfits.id,
      name: outfits.name,
      description: outfits.description,
      slug: outfits.slug,
    })
    .from(outfits)
    .where(isNull(outfits.slug));

  console.log(`Found ${outfitsWithoutSlugs.length} outfits without slugs\n`);

  if (outfitsWithoutSlugs.length === 0) {
    console.log("No outfits to process. Exiting.");
    return;
  }

  // Fetch all existing slugs to ensure uniqueness
  const existingOutfits = await db
    .select({ slug: outfits.slug })
    .from(outfits);
  const existingSlugs = new Set(
    existingOutfits.map((o) => o.slug).filter((s): s is string => s !== null)
  );

  let processed = 0;
  let errors = 0;

  // Process in batches with parallel requests
  const BATCH_SIZE = 20; // Process 20 at a time
  const batches = [];
  for (let i = 0; i < outfitsWithoutSlugs.length; i += BATCH_SIZE) {
    batches.push(outfitsWithoutSlugs.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing in ${batches.length} batches of ${BATCH_SIZE}...\n`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\nBatch ${batchIndex + 1}/${batches.length}...`);

    // Process all outfits in batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (outfit) => {
        const baseSlug = await generateSlug(
          outfit.name,
          outfit.description || undefined
        );
        return { outfit, baseSlug };
      })
    );

    // Update database with results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { outfit, baseSlug } = result.value;

        try {
          // Ensure uniqueness
          const uniqueSlug = ensureUniqueSlug(baseSlug, Array.from(existingSlugs));

          // Update database
          await db
            .update(outfits)
            .set({ slug: uniqueSlug })
            .where(eq(outfits.id, outfit.id));

          // Add to existing slugs set
          existingSlugs.add(uniqueSlug);

          console.log(`  ✓ [${outfit.id}] "${outfit.name}" → "${uniqueSlug}"`);
          processed++;
        } catch (error) {
          console.error(`  ✗ Error updating outfit ${outfit.id}:`, error);
          errors++;
        }
      } else {
        console.error(`  ✗ Error generating slug:`, result.reason);
        errors++;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Backfill complete!");
  console.log(`  Successfully processed: ${processed}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${outfitsWithoutSlugs.length}`);
  console.log("=".repeat(50) + "\n");

  // Verify all outfits now have slugs
  const remainingWithoutSlugs = await db
    .select({ id: outfits.id })
    .from(outfits)
    .where(isNull(outfits.slug));

  if (remainingWithoutSlugs.length > 0) {
    console.warn(
      `⚠️  Warning: ${remainingWithoutSlugs.length} outfits still don't have slugs`
    );
    console.warn("   IDs:", remainingWithoutSlugs.map((o) => o.id).join(", "));
  } else {
    console.log("✓ All outfits now have slugs!");
  }
}

main()
  .then(() => {
    console.log("\nScript finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Fatal error:", error);
    process.exit(1);
  });
