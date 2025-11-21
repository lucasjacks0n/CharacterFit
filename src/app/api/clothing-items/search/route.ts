import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    const searchTerm = `%${query}%`;
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
        updated_at
      FROM clothing_items
      WHERE title ILIKE ${searchTerm}
        OR brand ILIKE ${searchTerm}
        OR category ILIKE ${searchTerm}
        OR subcategory ILIKE ${searchTerm}
        OR color ILIKE ${searchTerm}
      ORDER BY created_at DESC
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
