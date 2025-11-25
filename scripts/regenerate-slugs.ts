/**
 * Regenerate slugs for all outfits (removes "outfit" word and improves quality)
 *
 * Run with: npx dotenv -- npx tsx scripts/regenerate-slugs.ts
 */

import { db } from "../src/db";
import { outfits } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "../src/lib/deepseek";

async function main() {
  console.log("Regenerating all outfit slugs...\n");

  // Fetch all outfits
  const allOutfits = await db
    .select({
      id: outfits.id,
      name: outfits.name,
      description: outfits.description,
      slug: outfits.slug,
    })
    .from(outfits);

  console.log(`Found ${allOutfits.length} outfits\n`);

  const existingSlugs = new Set<string>();
  let processed = 0;
  let errors = 0;

  // Process in batches
  const BATCH_SIZE = 20;
  const batches = [];
  for (let i = 0; i < allOutfits.length; i += BATCH_SIZE) {
    batches.push(allOutfits.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing in ${batches.length} batches of ${BATCH_SIZE}...\n`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\nBatch ${batchIndex + 1}/${batches.length}...`);

    // Generate slugs in parallel
    const results = await Promise.allSettled(
      batch.map(async (outfit) => {
        const baseSlug = await generateSlug(
          outfit.name,
          outfit.description || undefined
        );
        return { outfit, baseSlug };
      })
    );

    // Update database
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { outfit, baseSlug } = result.value;

        try {
          const uniqueSlug = ensureUniqueSlug(baseSlug, Array.from(existingSlugs));

          await db
            .update(outfits)
            .set({ slug: uniqueSlug })
            .where(eq(outfits.id, outfit.id));

          existingSlugs.add(uniqueSlug);

          console.log(`  ✓ [${outfit.id}] "${outfit.name}"`);
          console.log(`     Old: ${outfit.slug}`);
          console.log(`     New: ${uniqueSlug}`);
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
  console.log("Regeneration complete!");
  console.log(`  Successfully processed: ${processed}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${allOutfits.length}`);
  console.log("=".repeat(50) + "\n");
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Fatal error:", error);
    process.exit(1);
  });
