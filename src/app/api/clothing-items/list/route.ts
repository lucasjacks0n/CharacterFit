import { NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems, outfitItems } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const items = await db
      .select({
        id: clothingItems.id,
        title: clothingItems.title,
        brand: clothingItems.brand,
        category: clothingItems.category,
        subcategory: clothingItems.subcategory,
        color: clothingItems.color,
        material: clothingItems.material,
        price: clothingItems.price,
        imageUrl: clothingItems.imageUrl,
        createdAt: clothingItems.createdAt,
        outfitCount: sql<number>`count(distinct ${outfitItems.outfitId})::int`,
      })
      .from(clothingItems)
      .leftJoin(outfitItems, eq(clothingItems.id, outfitItems.clothingItemId))
      .groupBy(clothingItems.id)
      .orderBy(desc(clothingItems.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching clothing items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch clothing items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
