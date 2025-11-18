import { NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeAmazonProductsBatch, type BatchScrapeResult } from "@/lib/scrapers/amazon-scraper";
import { normalizeAmazonUrl } from "@/lib/amazon-url-utils";
import { downloadAndUploadImage } from "@/lib/google-storage";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { productUrls } = await request.json();

    if (!productUrls || !Array.isArray(productUrls) || productUrls.length === 0) {
      return NextResponse.json(
        { error: "productUrls array is required" },
        { status: 400 }
      );
    }

    console.log(`Batch scraping ${productUrls.length} products...`);

    // Normalize all URLs first
    const normalizedUrls = productUrls.map((url: string) => normalizeAmazonUrl(url));

    // Scrape all products with a single Chrome instance
    const scrapeResults = await scrapeAmazonProductsBatch(normalizedUrls);

    // Process each result
    const results = await Promise.all(
      scrapeResults.map(async (result) => {
        if (!result.success || !result.data) {
          return {
            url: result.url,
            success: false,
            error: result.error || "Failed to scrape product",
          };
        }

        try {
          // Check if product already exists (by normalized URL)
          const existingItem = await db
            .select()
            .from(clothingItems)
            .where(eq(clothingItems.productUrl, result.url))
            .limit(1);

          if (existingItem.length > 0) {
            return {
              url: result.url,
              success: true,
              isDuplicate: true,
              item: existingItem[0],
            };
          }

          // Upload image to Google Cloud Storage
          let uploadedImageUrl: string | null = null;
          if (result.data.imageUrl) {
            const imageUuid = randomUUID();
            const extension = result.data.imageUrl.toLowerCase().includes(".png") ? "png" : "jpg";
            const destinationPath = `product-images/${imageUuid}.${extension}`;

            uploadedImageUrl = await downloadAndUploadImage(
              result.data.imageUrl,
              destinationPath
            );
          }

          // Save to database
          const [newItem] = await db
            .insert(clothingItems)
            .values({
              title: result.data.title,
              brand: result.data.brand || null,
              price: result.data.price?.toString() || null,
              color: result.data.color || null,
              imageUrl: uploadedImageUrl,
              productUrl: result.url,
              category: null,
              subcategory: null,
              material: null,
              description: result.data.description || null,
            })
            .returning();

          return {
            url: result.url,
            success: true,
            isDuplicate: false,
            item: newItem,
          };
        } catch (error) {
          console.error(`Error saving product ${result.url}:`, error);
          return {
            url: result.url,
            success: false,
            error: error instanceof Error ? error.message : "Failed to save product",
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    console.log(
      `Batch scraping complete: ${successCount} succeeded, ${errorCount} failed`
    );

    return NextResponse.json({
      results,
      summary: {
        total: productUrls.length,
        succeeded: successCount,
        failed: errorCount,
      },
    });
  } catch (error) {
    console.error("Batch scraping error:", error);
    return NextResponse.json(
      {
        error: "Failed to batch scrape products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
