import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { normalizeUrl } from "@/lib/url-utils";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    // Normalize the product URL
    const normalizedProductUrl = normalizeUrl(productUrl);

    // Check for duplicate product URL
    if (normalizedProductUrl) {
      const existingItem = await db
        .select()
        .from(clothingItems)
        .where(eq(clothingItems.productUrl, normalizedProductUrl))
        .limit(1);

      if (existingItem.length > 0) {
        return NextResponse.json(
          {
            error: "A product with this URL already exists",
            existingItem: existingItem[0],
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // Insert into database
    const [newItem] = await db
      .insert(clothingItems)
      .values({
        title,
        brand: brand || null,
        category,
        subcategory: subcategory || null,
        color: color || null,
        material: material || null,
        description: description || null,
        price: price || null,
        productUrl: normalizedProductUrl,
        imageUrl: imageUrl || null,
      })
      .returning();

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error creating clothing item:", error);
    return NextResponse.json(
      { error: "Failed to create clothing item" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const items = await db.select().from(clothingItems);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching clothing items:", error);
    return NextResponse.json(
      { error: "Failed to fetch clothing items" },
      { status: 500 }
    );
  }
}
