import { NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems, outfits } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "all"; // 'items', 'outfits', or 'all'
    const requestedLimit = parseInt(searchParams.get("limit") || "20");

    // Security: Cap the limit to prevent scraping
    const MAX_LIMIT = 50;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query cannot be empty" },
        { status: 400 }
      );
    }

    const searchTerm = `%${query}%`;
    const results: {
      items?: any[];
      outfits?: any[];
    } = {};

    // Search clothing items
    if (type === "items" || type === "all") {
      const itemResults = await db.execute(sql`
        SELECT
          id,
          title,
          brand,
          category,
          subcategory,
          color,
          price,
          image_url,
          product_url
        FROM clothing_items
        WHERE title ILIKE ${searchTerm}
          OR brand ILIKE ${searchTerm}
          OR category ILIKE ${searchTerm}
          OR subcategory ILIKE ${searchTerm}
          OR color ILIKE ${searchTerm}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      const rows = (itemResults as any).rows || itemResults;
      results.items = Array.isArray(rows) ? rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        brand: row.brand,
        category: row.category,
        subcategory: row.subcategory,
        color: row.color,
        price: row.price,
        imageUrl: row.image_url,
        productUrl: row.product_url,
      })) : [];
    }

    // Search outfits
    if (type === "outfits" || type === "all") {
      const outfitResults = await db.execute(sql`
        SELECT
          slug,
          name,
          description,
          occasion,
          season,
          inspiration_photo_url as image_url
        FROM outfits
        WHERE status = 1
          AND slug IS NOT NULL
          AND (
            name ILIKE ${searchTerm}
            OR description ILIKE ${searchTerm}
            OR occasion ILIKE ${searchTerm}
            OR season ILIKE ${searchTerm}
          )
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      const rows = (outfitResults as any).rows || outfitResults;
      results.outfits = Array.isArray(rows) ? rows.map((row: any) => ({
        slug: row.slug,
        name: row.name,
        description: row.description,
        occasion: row.occasion,
        season: row.season,
        imageUrl: row.image_url,
      })) : [];
    }

    return NextResponse.json({
      query,
      ...results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
