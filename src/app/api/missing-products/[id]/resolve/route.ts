import { NextResponse } from "next/server";
import { db } from "@/db";
import { missingProducts, clothingItems, outfitItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST - Resolve a missing product by scraping replacement URL and adding to outfit
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { replacementUrl } = body;
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (!replacementUrl) {
      return NextResponse.json(
        { error: "replacementUrl is required" },
        { status: 400 }
      );
    }

    // Get the missing product
    const [missingProduct] = await db
      .select()
      .from(missingProducts)
      .where(eq(missingProducts.id, id));

    if (!missingProduct) {
      return NextResponse.json(
        { error: "Missing product not found" },
        { status: 404 }
      );
    }

    // Call the Amazon scraper API to get product details
    const scrapeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/scrape-amazon`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: replacementUrl,
          autoSave: true,
        }),
      }
    );

    if (!scrapeResponse.ok) {
      const errorData = await scrapeResponse.json();
      return NextResponse.json(
        {
          error: "Failed to scrape replacement product",
          details: errorData.error || errorData.details,
        },
        { status: scrapeResponse.status }
      );
    }

    const scrapeResult = await scrapeResponse.json();
    const item = scrapeResult.item;

    if (!item || !item.id) {
      return NextResponse.json(
        {
          error: "Failed to get product details from scraper",
          details: "Item not returned from scrape-amazon API",
        },
        { status: 500 }
      );
    }

    // Add the item to the outfit
    await db.insert(outfitItems).values({
      outfitId: missingProduct.outfitId,
      clothingItemId: item.id,
    });

    // Update missing product status to resolved and save replacement URL
    await db
      .update(missingProducts)
      .set({
        replacementUrl,
        status: "resolved",
        updatedAt: new Date(),
      })
      .where(eq(missingProducts.id, id));

    return NextResponse.json({
      success: true,
      message: "Product resolved and added to outfit",
      item,
    });
  } catch (error) {
    console.error("Error resolving missing product:", error);
    return NextResponse.json(
      {
        error: "Failed to resolve missing product",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
