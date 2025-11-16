import { NextRequest, NextResponse } from "next/server";
import { scrapeAmazonProduct } from "@/lib/scrapers/amazon-scraper";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { normalizeUrl } from "@/lib/url-utils";

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
    const normalizedUrl = normalizeUrl(productUrl);

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid product URL" },
        { status: 400 }
      );
    }

    // Scrape the product
    console.log("Scraping product:", normalizedUrl);
    const scrapedData = await scrapeAmazonProduct(normalizedUrl);

    // You can optionally save to database immediately
    // or return the data to let the user review/edit first
    const shouldAutoSave = body.autoSave === true;

    if (shouldAutoSave) {
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
          imageUrl: scrapedData.imageUrl || null,
        })
        .returning();

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
