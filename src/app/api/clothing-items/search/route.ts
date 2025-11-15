import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    const searchTerm = `%${query}%`;

    // Search across title, brand, color, and category
    const results = await db
      .select()
      .from(clothingItems)
      .where(
        or(
          ilike(clothingItems.title, searchTerm),
          ilike(clothingItems.brand, searchTerm),
          ilike(clothingItems.color, searchTerm),
          ilike(clothingItems.category, searchTerm)
        )
      )
      .limit(20);

    return NextResponse.json(results);
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
