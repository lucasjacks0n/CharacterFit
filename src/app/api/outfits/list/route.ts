import { NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems, clothingItems, missingProducts } from "@/db/schema";
import { eq, desc, ilike, or, and, sql, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
    const search = searchParams.get('search')?.trim() || '';

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(outfits.name, `%${search}%`),
          ilike(outfits.description, `%${search}%`),
          ilike(outfits.occasion, `%${search}%`),
          ilike(outfits.season, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count and approved count
    const [{ total }] = await db
      .select({ total: count() })
      .from(outfits)
      .where(whereClause);

    const [{ approvedCount }] = await db
      .select({ approvedCount: count() })
      .from(outfits)
      .where(
        whereClause
          ? and(whereClause, eq(outfits.status, 1))
          : eq(outfits.status, 1)
      );

    // Get paginated outfits - approved first, then by created date
    const allOutfits = await db
      .select()
      .from(outfits)
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${outfits.status} = 1 THEN 0 ELSE 1 END`,
        desc(outfits.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // For each outfit, get its items and missing products count
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

        // Get count of pending missing products for this outfit
        const [{ missingCount }] = await db
          .select({ missingCount: count() })
          .from(missingProducts)
          .where(
            and(
              eq(missingProducts.outfitId, outfit.id),
              eq(missingProducts.status, "pending")
            )
          );

        return {
          ...outfit,
          items,
          missingProductsCount: missingCount,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      outfits: outfitsWithItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        approvedCount,
      },
    });
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
