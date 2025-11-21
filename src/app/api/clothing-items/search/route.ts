import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pipeline } from "@xenova/transformers";

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Search using vector similarity
    const results = await db.execute(sql`
      SELECT
        id,
        title,
        brand,
        category,
        subcategory,
        color,
        material,
        description,
        price,
        product_url,
        image_url,
        created_at,
        updated_at,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM clothing_items
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 20
    `);

    const rows = (results as any).rows || results || [];
    const items = Array.isArray(rows) ? rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      brand: row.brand,
      category: row.category,
      subcategory: row.subcategory,
      color: row.color,
      material: row.material,
      description: row.description,
      price: row.price,
      productUrl: row.product_url,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      similarity: parseFloat(row.similarity),
    })) : [];

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error searching clothing items:", error);
    return NextResponse.json(
      {
        error: "Failed to search clothing items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
