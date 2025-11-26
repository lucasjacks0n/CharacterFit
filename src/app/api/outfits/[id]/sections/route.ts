import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfitSections } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfitId = parseInt(id);

    if (isNaN(outfitId)) {
      return NextResponse.json(
        { error: "Invalid outfit ID" },
        { status: 400 }
      );
    }

    const sections = await db
      .select()
      .from(outfitSections)
      .where(eq(outfitSections.outfitId, outfitId))
      .orderBy(outfitSections.id);

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Error fetching outfit sections:", error);
    return NextResponse.json(
      { error: "Failed to fetch outfit sections" },
      { status: 500 }
    );
  }
}
