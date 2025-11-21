import { NextRequest, NextResponse } from "next/server";
import { scrapeAmazonProduct } from "@/lib/scrapers/amazon-scraper";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { normalizeUrl } from "@/lib/url-utils";
import { normalizeAmazonUrl } from "@/lib/amazon-url-utils";
import { downloadAndUploadImage } from "@/lib/google-storage";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateClothingItemEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl, category, subcategory } = body;

    if (!productUrl) {
      return NextResponse.json(
        { error: "Product URL is required" },
        { status: 400 }
      );
    }

    // Validate it's an Amazon URL
    if (!productUrl.includes("amazon.com")) {
      return NextResponse.json(
        { error: "Must be an Amazon product URL" },
        { status: 400 }
      );
    }

    // Normalize URL - add https:// if missing protocol
    let normalizedUrl = normalizeUrl(productUrl);

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid product URL" },
        { status: 400 }
      );
    }

    // Further normalize Amazon URLs to prevent duplicates (strip parameters, etc.)
    normalizedUrl = normalizeAmazonUrl(normalizedUrl);

    // Check for duplicates BEFORE scraping (save time and resources)
    const existingItem = await db
      .select()
      .from(clothingItems)
      .where(eq(clothingItems.productUrl, normalizedUrl))
      .limit(1);

    if (existingItem.length > 0) {
      return NextResponse.json(
        {
          error: "A product with this URL already exists",
          existingItem: existingItem[0],
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Scrape the product
    console.log("Scraping product:", normalizedUrl);
    const scrapedData = await scrapeAmazonProduct(normalizedUrl);

    // You can optionally save to database immediately
    // or return the data to let the user review/edit first
    const shouldAutoSave = body.autoSave === true;

    if (shouldAutoSave) {
      // Download and store the product image in GCS if available
      let storedImageUrl = scrapedData.imageUrl || null;

      if (scrapedData.imageUrl) {
        try {
          console.log("Downloading and storing product image...");
          // Generate a random UUID for the image filename
          const imageUuid = randomUUID();
          // Determine file extension from URL
          const extension = scrapedData.imageUrl.toLowerCase().includes(".png")
            ? "png"
            : "jpg";
          const destinationPath = `product-images/${imageUuid}.${extension}`;

          storedImageUrl = await downloadAndUploadImage(
            scrapedData.imageUrl,
            destinationPath
          );
          console.log("Product image stored at:", storedImageUrl);
        } catch (error) {
          console.error("Failed to download/store product image:", error);
          // Fall back to original URL if storage fails
          storedImageUrl = scrapedData.imageUrl;
        }
      }

      const [newItem] = await db
        .insert(clothingItems)
        .values({
          title: scrapedData.title,
          brand: scrapedData.brand || null,
          category: category || null,
          subcategory: subcategory || null,
          color: scrapedData.color || null,
          material: null, // Will be extracted via LLM later
          description: scrapedData.description || null,
          price: scrapedData.price?.toString() || null,
          productUrl: normalizedUrl,
          imageUrl: storedImageUrl,
        })
        .returning();

      // Generate and update embedding (non-blocking)
      generateClothingItemEmbedding(scrapedData.title)
        .then((embedding) => {
          return db.execute(
            sql`UPDATE clothing_items SET embedding = ${embedding}::vector WHERE id = ${newItem.id}`
          );
        })
        .catch((err) => console.error("Failed to generate clothing item embedding:", err));

      return NextResponse.json(
        {
          message: "Product scraped and saved successfully",
          item: newItem,
        },
        { status: 201 }
      );
    }

    // Return scraped data for review
    return NextResponse.json({
      message: "Product scraped successfully",
      data: scrapedData,
    });
  } catch (error) {
    console.error("Error scraping Amazon product:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
