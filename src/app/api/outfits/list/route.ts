import { NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Get all outfits (newest first)
    const allOutfits = await db
      .select()
      .from(outfits)
      .orderBy(desc(outfits.createdAt));

    // For each outfit, get its items
    const outfitsWithItems = await Promise.all(
      allOutfits.map(async (outfit) => {
        const items = await db
          .select({
            id: clothingItems.id,
            title: clothingItems.title,
            brand: clothingItems.brand,
            imageUrl: clothingItems.imageUrl,
            color: clothingItems.color,
          })
          .from(outfitItems)
          .innerJoin(
            clothingItems,
            eq(outfitItems.clothingItemId, clothingItems.id)
          )
          .where(eq(outfitItems.outfitId, outfit.id))
          .orderBy(desc(clothingItems.id));

        return {
          ...outfit,
          items,
        };
      })
    );

    return NextResponse.json(outfitsWithItems);
  } catch (error) {
    console.error("Error fetching outfits:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch outfits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
