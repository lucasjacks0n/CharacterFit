import { NextResponse } from "next/server";
import { db } from "@/db";
import { clothingItems } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const items = await db
      .select()
      .from(clothingItems)
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
