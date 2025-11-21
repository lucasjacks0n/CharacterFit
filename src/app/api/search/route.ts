import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";
import { db } from "@/db";
import { clothingItems, outfits } from "@/db/schema";
import { sql } from "drizzle-orm";

// Cache the embedder to avoid reloading on each request
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(query, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

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

    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

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
          product_url,
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM clothing_items
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
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
        similarity: parseFloat(row.similarity),
      })) : [];
    }

    // Search outfits
    if (type === "outfits" || type === "all") {
      const outfitResults = await db.execute(sql`
        SELECT
          id,
          name,
          description,
          occasion,
          season,
          image_url,
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM outfits
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `);

      const rows = (outfitResults as any).rows || outfitResults;
      results.outfits = Array.isArray(rows) ? rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        occasion: row.occasion,
        season: row.season,
        imageUrl: row.image_url,
        similarity: parseFloat(row.similarity),
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
