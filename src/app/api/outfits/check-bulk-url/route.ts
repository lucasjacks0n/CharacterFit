import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Check if an outfit with this bulk URL already exists
    const existingOutfits = await db
      .select()
      .from(outfits)
      .where(eq(outfits.fromBulkUrl, url));

    if (existingOutfits.length > 0) {
      return NextResponse.json({
        exists: true,
        outfitName: existingOutfits[0].name,
        outfitId: existingOutfits[0].id,
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error("Error checking bulk URL:", error);
    return NextResponse.json(
      {
        error: "Failed to check bulk URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
