import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems, outfitItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET single clothing item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    const [item] = await db
      .select()
      .from(clothingItems)
      .where(eq(clothingItems.id, itemId));

    if (!item) {
      return NextResponse.json(
        { error: "Clothing item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching clothing item:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch clothing item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT update clothing item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);
    const body = await request.json();

    const {
      title,
      brand,
      category,
      subcategory,
      color,
      material,
      description,
      price,
      productUrl,
      imageUrl,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const [updatedItem] = await db
      .update(clothingItems)
      .set({
        title: title.trim(),
        brand: brand || null,
        category: category || null,
        subcategory: subcategory || null,
        color: color || null,
        material: material || null,
        description: description || null,
        price: price || null,
        productUrl: productUrl || null,
        imageUrl: imageUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(clothingItems.id, itemId))
      .returning();

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Clothing item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Clothing item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating clothing item:", error);
    return NextResponse.json(
      {
        error: "Failed to update clothing item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE clothing item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    // Delete outfit items first (due to foreign key constraint)
    await db.delete(outfitItems).where(eq(outfitItems.clothingItemId, itemId));

    // Delete clothing item
    await db.delete(clothingItems).where(eq(clothingItems.id, itemId));

    return NextResponse.json({
      message: "Clothing item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting clothing item:", error);
    return NextResponse.json(
      {
        error: "Failed to delete clothing item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
