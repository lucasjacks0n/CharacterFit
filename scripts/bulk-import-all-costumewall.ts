// Script to bulk import all costume pages from CostumeWall sitemap

const SITEMAP_URL = "https://costumewall.com/post-sitemap2.xml";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const DELAY_BETWEEN_IMPORTS = 0; // 10 seconds between each import (increased for stability)
const MAX_RETRIES = 2; // Number of retries for failed imports
const MAX_IMPORTS_PER_RUN = 0; // Limit imports per run (set to 0 for unlimited)

interface CostumeWallProduct {
  url: string;
  label: string;
}

interface BatchScrapeResult {
  url: string;
  success: boolean;
  item?: any;
  error?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSitemap(): Promise<string[]> {
  console.log(`Fetching sitemap from ${SITEMAP_URL}...`);
  const response = await fetch(SITEMAP_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Extract URLs from XML using regex (simple approach)
  const urlMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);

  if (!urlMatches) {
    throw new Error("No URLs found in sitemap");
  }

  const urls = urlMatches.map((match) =>
    match
      .replace("<loc>", "")
      .replace("</loc>", "")
      .replace("<![CDATA[", "")
      .replace("]]>", "")
      .trim()
  );

  console.log(`Found ${urls.length} URLs in sitemap\n`);
  return urls;
}

async function checkIfAlreadyImported(url: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/outfits/check-bulk-url?url=${encodeURIComponent(
        url
      )}`
    );

    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
  } catch (error) {
    console.error(`Error checking if URL already imported:`, error);
  }
  return false;
}

async function importCostumeWallPage(
  costumeWallUrl: string,
  retryCount = 0
): Promise<boolean> {
  try {
    console.log(`  Scraping CostumeWall page...`);

    // Step 1: Scrape CostumeWall page
    const cwResponse = await fetch(`${API_BASE_URL}/api/scrape-costumewall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costumeWallUrl }),
    });

    if (!cwResponse.ok) {
      const error = await cwResponse.json();
      throw new Error(error.details || "Failed to scrape CostumeWall page");
    }

    const { outfitName, products, amazonCount, nonAmazonCount } =
      await cwResponse.json();
    console.log(
      `  Found outfit: "${outfitName}" with ${products.length} products (${amazonCount} Amazon, ${nonAmazonCount} non-Amazon)`
    );

    if (products.length === 0) {
      console.log(`  ⚠️  No products found, skipping\n`);
      return false;
    }

    // Separate Amazon and non-Amazon products
    const amazonProducts = products.filter((p: any) => p.isAmazon);
    const nonAmazonProducts = products.filter((p: any) => !p.isAmazon);

    if (amazonProducts.length === 0) {
      console.log(
        `  ⚠️  No Amazon products found (all from other retailers), skipping\n`
      );
      return false;
    }

    // Step 2: Batch scrape all Amazon products
    console.log(`  Scraping ${amazonProducts.length} Amazon products...`);
    const batchResponse = await fetch(
      `${API_BASE_URL}/api/scrape-amazon/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrls: amazonProducts.map((p: any) => p.url),
        }),
      }
    );

    if (!batchResponse.ok) {
      const error = await batchResponse.json();
      throw new Error(error.details || "Failed to batch scrape products");
    }

    const { results } = await batchResponse.json();

    // Process results
    const successfulItems: any[] = [];
    const skippedList: CostumeWallProduct[] = [];

    // Add all non-Amazon products to skipped list immediately
    nonAmazonProducts.forEach((p: any) => {
      skippedList.push({
        url: p.url,
        label: p.label,
      });
    });

    // Process Amazon scrape results
    for (let i = 0; i < results.length; i++) {
      const result: BatchScrapeResult = results[i];
      if (result.success && result.item) {
        successfulItems.push(result.item);
      } else {
        const productInfo = amazonProducts[i];
        skippedList.push({
          url: result.url,
          label: productInfo.label,
        });
      }
    }

    console.log(`  Successfully scraped: ${successfulItems.length} items`);
    console.log(`  Unavailable: ${skippedList.length} items`);

    // Step 3: Create outfit (even if no items were successfully scraped)
    // This logs the fromBulkUrl and prevents future retries
    console.log(`  Creating outfit...`);
    const createResponse = await fetch(`${API_BASE_URL}/api/outfits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: outfitName,
        description: null,
        occasion: null,
        season: null,
        itemIds: successfulItems.map((item) => item.id),
        inspirationPhotoUrl: null,
        fromBulkUrl: costumeWallUrl,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.details || "Failed to create outfit");
    }

    const { outfit } = await createResponse.json();
    console.log(`  ✅ Outfit created: "${outfit.name}" (ID: ${outfit.id})`);

    // Step 4: Save missing products if any
    if (skippedList.length > 0) {
      console.log(`  Saving ${skippedList.length} missing products...`);

      await fetch(`${API_BASE_URL}/api/missing-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfitId: outfit.id,
          products: skippedList.map((p) => ({
            productName: p.label,
            originalAmazonUrl: p.url,
          })),
        }),
      });
    }

    console.log(`  ✅ Import complete!\n`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error:`, errorMessage);

    // Retry if ChromeDriver error or network issue
    if (
      retryCount < MAX_RETRIES &&
      (errorMessage.includes("chrome not reachable") ||
        errorMessage.includes("session") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNRESET"))
    ) {
      console.log(
        `  🔄 Retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`
      );
      await sleep(5000); // Wait 5 seconds before retry
      return importCostumeWallPage(costumeWallUrl, retryCount + 1);
    }

    console.log("");
    return false;
  }
}

async function main() {
  try {
    console.log("=".repeat(80));
    console.log("BULK IMPORT ALL COSTUMEWALL PAGES");
    console.log("=".repeat(80));
    console.log("");

    // Fetch all URLs from sitemap
    const urls = await fetchSitemap();

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Determine how many to process
    const totalToProcess =
      MAX_IMPORTS_PER_RUN > 0
        ? Math.min(MAX_IMPORTS_PER_RUN, urls.length)
        : urls.length;

    if (MAX_IMPORTS_PER_RUN > 0) {
      console.log(`⚠️  Limited to ${MAX_IMPORTS_PER_RUN} imports per run\n`);
    }

    // Process each URL
    for (let i = 0; i < totalToProcess; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${totalToProcess}] ${url}`);

      // Check if already imported
      const alreadyImported = await checkIfAlreadyImported(url);
      if (alreadyImported) {
        console.log(`  ⏭️  Already imported, skipping\n`);
        skipped++;
        continue;
      }

      // Import the page
      const success = await importCostumeWallPage(url);

      if (success) {
        imported++;
      } else {
        failed++;
      }

      // Wait before next import to avoid overwhelming the system
      if (i < totalToProcess - 1) {
        console.log(
          `  Waiting ${DELAY_BETWEEN_IMPORTS / 1000}s before next import...`
        );
        await sleep(DELAY_BETWEEN_IMPORTS);
        console.log("");
      }
    }

    // Summary
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total URLs in sitemap: ${urls.length}`);
    console.log(`Processed this run: ${totalToProcess}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Already imported (skipped): ${skipped}`);
    console.log(`Failed: ${failed}`);
    if (MAX_IMPORTS_PER_RUN > 0 && totalToProcess < urls.length) {
      console.log(
        `\n⚠️  ${
          urls.length - totalToProcess
        } URLs remaining. Run script again to continue.`
      );
    }
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Bulk import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Bulk import failed:", error);
    process.exit(1);
  });
