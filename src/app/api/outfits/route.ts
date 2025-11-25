import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems } from "@/db/schema";
import { sql } from "drizzle-orm";
import { generateOutfitEmbedding } from "@/lib/embeddings";
import { generateSlug, ensureUniqueSlug } from "@/lib/deepseek";

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

    // Generate slug using DeepSeek
    const baseSlug = await generateSlug(
      name.trim(),
      description?.trim() || undefined
    );

    // Get existing slugs to ensure uniqueness
    const existingOutfits = await db.select({ slug: outfits.slug }).from(outfits);
    const existingSlugs = existingOutfits
      .map((o) => o.slug)
      .filter((s): s is string => s !== null);

    const uniqueSlug = ensureUniqueSlug(baseSlug, existingSlugs);

    // Create the outfit
    const [newOutfit] = await db
      .insert(outfits)
      .values({
        name: name.trim(),
        slug: uniqueSlug,
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

    // Generate and update embedding (non-blocking)
    generateOutfitEmbedding(name.trim())
      .then((embedding) => {
        return db.execute(
          sql`UPDATE outfits SET embedding = ${embedding}::vector WHERE id = ${newOutfit.id}`
        );
      })
      .catch((err) => console.error("Failed to generate outfit embedding:", err));

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
