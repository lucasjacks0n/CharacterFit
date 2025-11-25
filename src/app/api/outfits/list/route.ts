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
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam ? parseInt(statusParam, 10) : null;

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
    if (statusFilter !== null && !isNaN(statusFilter)) {
      conditions.push(eq(outfits.status, statusFilter));
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

    // Get paginated outfits - approved first, then by missing products count ascending
    let allOutfits;

    // Build WHERE clause for SQL
    const whereConditions = [];
    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(sql`(
        o.name ILIKE ${searchTerm}
        OR o.description ILIKE ${searchTerm}
        OR o.occasion ILIKE ${searchTerm}
        OR o.season ILIKE ${searchTerm}
      )`);
    }
    if (statusFilter !== null && !isNaN(statusFilter)) {
      whereConditions.push(sql`o.status = ${statusFilter}`);
    }

    const whereSQL = whereConditions.length > 0
      ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}`
      : sql``;

    allOutfits = await db.execute(sql`
      SELECT
        o.*,
        (
          SELECT COUNT(*)
          FROM missing_products mp
          WHERE mp.outfit_id = o.id
            AND mp.status = 'pending'
        ) as missing_products_count
      FROM outfits o
      ${whereSQL}
      ORDER BY
        CASE WHEN o.status = 1 THEN 0 ELSE 1 END,
        missing_products_count ASC,
        o.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const outfitsRows = (allOutfits as any).rows || allOutfits || [];

    // For each outfit, get its items
    const outfitsWithItems = await Promise.all(
      outfitsRows.map(async (outfit: any) => {
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
          id: outfit.id,
          name: outfit.name,
          description: outfit.description,
          occasion: outfit.occasion,
          season: outfit.season,
          status: outfit.status,
          imageUrl: outfit.image_url,
          inspirationPhotoUrl: outfit.inspiration_photo_url,
          createdAt: outfit.created_at,
          updatedAt: outfit.updated_at,
          items,
          missingProductsCount: parseInt(outfit.missing_products_count) || 0,
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
