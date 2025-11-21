import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateOutfitEmbedding } from "@/lib/embeddings";

// GET single outfit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfitId = parseInt(id);

    // Get outfit
    const [outfit] = await db
      .select()
      .from(outfits)
      .where(eq(outfits.id, outfitId));

    if (!outfit) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }

    // Get outfit items
    const items = await db
      .select({
        id: clothingItems.id,
        title: clothingItems.title,
        brand: clothingItems.brand,
        price: clothingItems.price,
        color: clothingItems.color,
        imageUrl: clothingItems.imageUrl,
        category: clothingItems.category,
      })
      .from(outfitItems)
      .innerJoin(
        clothingItems,
        eq(outfitItems.clothingItemId, clothingItems.id)
      )
      .where(eq(outfitItems.outfitId, outfitId));

    return NextResponse.json({
      ...outfit,
      items,
    });
  } catch (error) {
    console.error("Error fetching outfit:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch outfit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT update outfit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfitId = parseInt(id);
    const body = await request.json();
    const { name, description, occasion, season, status, itemIds, inspirationPhotoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Outfit name is required" },
        { status: 400 }
      );
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "At least one clothing item is required" },
        { status: 400 }
      );
    }

    // Update outfit
    const [updatedOutfit] = await db
      .update(outfits)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        occasion: occasion?.trim() || null,
        season: season?.trim() || null,
        status: status ?? 0,
        inspirationPhotoUrl: inspirationPhotoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(outfits.id, outfitId))
      .returning();

    // Delete existing outfit items
    await db.delete(outfitItems).where(eq(outfitItems.outfitId, outfitId));

    // Create new outfit items relationships
    const outfitItemsData = itemIds.map((itemId: number) => ({
      outfitId: outfitId,
      clothingItemId: itemId,
    }));

    await db.insert(outfitItems).values(outfitItemsData);

    // Generate and update embedding (non-blocking)
    generateOutfitEmbedding(name.trim())
      .then((embedding) => {
        return db.execute(
          sql`UPDATE outfits SET embedding = ${embedding}::vector WHERE id = ${outfitId}`
        );
      })
      .catch((err) => console.error("Failed to generate outfit embedding:", err));

    return NextResponse.json({
      message: "Outfit updated successfully",
      outfit: updatedOutfit,
    });
  } catch (error) {
    console.error("Error updating outfit:", error);
    return NextResponse.json(
      {
        error: "Failed to update outfit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE outfit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfitId = parseInt(id);

    // Delete outfit items first (due to foreign key constraint)
    await db.delete(outfitItems).where(eq(outfitItems.outfitId, outfitId));

    // Delete outfit
    await db.delete(outfits).where(eq(outfits.id, outfitId));

    return NextResponse.json({
      message: "Outfit deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting outfit:", error);
    return NextResponse.json(
      {
        error: "Failed to delete outfit",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
