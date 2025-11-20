import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, occasion, season, itemIds, inspirationPhotoUrl, fromBulkUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Outfit name is required" },
        { status: 400 }
      );
    }

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: "itemIds must be an array" },
        { status: 400 }
      );
    }

    // Create the outfit
    const [newOutfit] = await db
      .insert(outfits)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        occasion: occasion?.trim() || null,
        season: season?.trim() || null,
        inspirationPhotoUrl: inspirationPhotoUrl || null,
        fromBulkUrl: fromBulkUrl || null,
      })
      .returning();

    // Create outfit items relationships (only if there are items)
    if (itemIds.length > 0) {
      const outfitItemsData = itemIds.map((itemId: number) => ({
        outfitId: newOutfit.id,
        clothingItemId: itemId,
      }));

      await db.insert(outfitItems).values(outfitItemsData);
    }

    return NextResponse.json(
      {
        message: "Outfit created successfully",
        outfit: newOutfit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating outfit:", error);
    return NextResponse.json(
      {
        error: "Failed to create outfit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allOutfits = await db.select().from(outfits);
    return NextResponse.json(allOutfits);
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
