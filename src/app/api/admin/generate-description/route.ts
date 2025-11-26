import { NextRequest, NextResponse } from "next/server";
import { fetchWikipediaSummary, cleanWikipediaSummary } from "@/lib/wikipedia";
import { generateOutfitDescription } from "@/lib/seo-content";
import { db } from "@/db";
import { outfitItems, clothingItems, outfits, outfitSections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { callDeepSeek } from "@/lib/deepseek";
import {
  combinedContentPrompt,
  buildPrompt,
  generateAllSections,
} from "@/prompts/outfitContentSections";

export async function POST(request: NextRequest) {
  try {
    // NOTE: Admin auth is handled by middleware at /api/admin/* routes
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
        console.log(
          `Wikipedia context retrieved: ${wikipediaContext.length} characters from full article`
        );
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
          .innerJoin(
            clothingItems,
            eq(outfitItems.clothingItemId, clothingItems.id)
          )
          .where(eq(outfitItems.outfitId, parseInt(outfitId)));

        // Filter out null displayTitles and collect them
        itemDisplayTitles = items
          .map((item) => item.displayTitle)
          .filter((title): title is string => !!title);

        console.log(
          `Found ${itemDisplayTitles.length} clothing items for outfit`
        );
      } catch (error) {
        console.warn("Failed to fetch clothing items:", error);
        // Continue without items rather than failing
      }
    }

    // Generate content sections using AI
    console.log(`\n========== GENERATING CONTENT SECTIONS FOR: ${outfitName} ==========\n`);

    const promptVariables = {
      outfit_name: outfitName.trim(),
      facts: wikipediaContext || "No Wikipedia context provided",
      list_of_costume_items: itemDisplayTitles.length > 0
        ? itemDisplayTitles.join(", ")
        : "No clothing items found",
      moondream_description: "No visual description available yet", // Placeholder for future moondream integration
    };

    // Generate all sections with a single API call
    const generatedContent = await generateAllSections(
      promptVariables,
      callDeepSeek,
      0.7
    );

    console.log("\n✅ Generated content:");
    console.log(JSON.stringify(generatedContent, null, 2));

    // Save sections to database if outfitId is provided
    if (outfitId) {
      const outfitIdInt = parseInt(outfitId);

      // Delete existing sections for this outfit (to avoid duplicates)
      await db.delete(outfitSections).where(eq(outfitSections.outfitId, outfitIdInt));

      // Insert new sections
      const sectionsToInsert = [
        {
          outfitId: outfitIdInt,
          sectionType: "main_description",
          heading: null,
          content: generatedContent.mainDescription,
          metaJson: null,
        },
        {
          outfitId: outfitIdInt,
          sectionType: "about_character",
          heading: `About ${outfitName.trim()}`,
          content: generatedContent.aboutCharacter,
          metaJson: null,
        },
        {
          outfitId: outfitIdInt,
          sectionType: "fast_facts",
          heading: "Fast Facts",
          content: generatedContent.fastFacts.map(f => `${f.label}: ${f.value}`).join("\n"),
          metaJson: JSON.stringify(generatedContent.fastFacts),
        },
      ];

      await db.insert(outfitSections).values(sectionsToInsert);

      console.log(`✅ Saved ${sectionsToInsert.length} sections to database for outfit ${outfitId}`);
    }

    return NextResponse.json({
      success: true,
      message: outfitId
        ? "Content generated and saved to database successfully"
        : "Content generated successfully (not saved - no outfitId provided)",
      generatedContent,
      savedToDatabase: !!outfitId,
      outfitId: outfitId || null,
      wikipediaContextLength: wikipediaContext?.length || 0,
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
