import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchWikipediaSummary, cleanWikipediaSummary } from "@/lib/wikipedia";
import { generateOutfitDescription } from "@/lib/seo-content";
import { db } from "@/db";
import { outfitItems, clothingItems, outfits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Admin authentication check
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { outfitName, wikipediaUrl, occasion, season, outfitId } = body;

    if (!outfitName || !outfitName.trim()) {
      return NextResponse.json(
        { error: "outfitName is required" },
        { status: 400 }
      );
    }

    let wikipediaContext: string | undefined;
    let itemDisplayTitles: string[] = [];

    // Fetch Wikipedia content if URL provided
    if (wikipediaUrl && wikipediaUrl.trim()) {
      console.log(`Fetching Wikipedia content for: ${wikipediaUrl}`);
      const wikiResult = await fetchWikipediaSummary(wikipediaUrl.trim());

      if (wikiResult.success && wikiResult.summary) {
        // Pass FULL Wikipedia article content to DeepSeek for rich, factual context
        wikipediaContext = cleanWikipediaSummary(wikiResult.summary);
        console.log(`Wikipedia context retrieved: ${wikipediaContext.length} characters from full article`);
      } else {
        console.warn(`Wikipedia fetch failed: ${wikiResult.error}`);
        // Continue without Wikipedia context rather than failing
      }
    }

    // Fetch clothing items if outfitId provided
    if (outfitId) {
      try {
        const items = await db
          .select({
            displayTitle: clothingItems.displayTitle,
          })
          .from(outfitItems)
          .innerJoin(clothingItems, eq(outfitItems.clothingItemId, clothingItems.id))
          .where(eq(outfitItems.outfitId, parseInt(outfitId)));

        // Filter out null displayTitles and collect them
        itemDisplayTitles = items
          .map((item) => item.displayTitle)
          .filter((title): title is string => !!title);

        console.log(`Found ${itemDisplayTitles.length} clothing items for outfit`);
      } catch (error) {
        console.warn('Failed to fetch clothing items:', error);
        // Continue without items rather than failing
      }
    }

    // Generate description using DeepSeek
    console.log(`Generating description for: ${outfitName}`);
    const description = await generateOutfitDescription({
      outfitName: outfitName.trim(),
      wikipediaContext,
      occasion: occasion?.trim(),
      season: season?.trim(),
      clothingItems: itemDisplayTitles,
    });

    // Automatically update the outfit description if outfitId provided
    if (outfitId) {
      try {
        await db
          .update(outfits)
          .set({
            description,
            updatedAt: new Date(),
          })
          .where(eq(outfits.id, parseInt(outfitId)));

        console.log(`Auto-saved description to outfit ${outfitId}`);
      } catch (error) {
        console.warn('Failed to auto-save description:', error);
        // Don't fail the request, just return the description
      }
    }

    return NextResponse.json({
      description,
      source: wikipediaContext ? "wikipedia" : "ai-only",
      wikipediaUsed: !!wikipediaContext,
      autoSaved: !!outfitId,
    });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      {
        error: "Failed to generate description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
