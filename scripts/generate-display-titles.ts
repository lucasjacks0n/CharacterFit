import "dotenv/config";
import { db } from "../src/db";
import { clothingItems } from "../src/db/schema";
import { sql, isNotNull } from "drizzle-orm";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BATCH_SIZE = 10; // Process 10 items at a time
const DELAY_MS = 100; // Small delay between batches to be respectful

if (!DEEPSEEK_API_KEY) {
  console.error("❌ DEEPSEEK_API_KEY not found in environment variables");
  process.exit(1);
}

async function generateShortTitle(longTitle: string): Promise<string> {
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Create concise product display titles (5 words or less). Output ONLY the title, no quotes or extra text.",
          },
          {
            role: "user",
            content: `Create a short display title: ${longTitle}`,
          },
        ],
        max_tokens: 20,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const title = data.choices[0].message.content.trim();

    // Remove quotes if present
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error(`Error generating title for "${longTitle}":`, error);
    throw error;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Starting display title generation...\n");

  // Get all clothing items that don't have a display title yet
  const items = await db
    .select({
      id: clothingItems.id,
      title: clothingItems.title,
      displayTitle: clothingItems.displayTitle,
    })
    .from(clothingItems)
    .where(sql`${clothingItems.displayTitle} IS NULL OR ${clothingItems.displayTitle} = ''`);

  const total = items.length;
  console.log(`📊 Found ${total} items without display titles\n`);

  if (total === 0) {
    console.log("✅ All items already have display titles!");
    process.exit(0);
  }

  let processed = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        try {
          const displayTitle = await generateShortTitle(item.title);

          await db
            .update(clothingItems)
            .set({ displayTitle })
            .where(sql`${clothingItems.id} = ${item.id}`);

          processed++;
          console.log(
            `✓ [${processed}/${total}] "${item.title}" → "${displayTitle}"`
          );
        } catch (error) {
          errors++;
          console.error(
            `✗ [${processed + errors}/${total}] Failed: "${item.title}"`
          );
        }
      })
    );

    // Small delay between batches
    if (i + BATCH_SIZE < items.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📈 Summary:");
  console.log(`   Total items: ${total}`);
  console.log(`   ✅ Processed successfully: ${processed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log("=".repeat(60));

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
