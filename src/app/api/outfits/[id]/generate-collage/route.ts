import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import https from "https";
import http from "http";
import { uploadToGoogleStorage } from "@/lib/google-storage";

const execAsync = promisify(exec);

async function downloadImage(url: string, filepath: string): Promise<void> {
  const file = await fs.open(filepath, "w");
  const fileStream = file.createWriteStream();

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(filepath).catch(() => {});
        reject(err);
      });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Disable collage generation in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: "Collage generation is not available in production" },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const outfitId = parseInt(id);

    // Get outfit items with their image URLs
    const items = await db
      .select({
        id: clothingItems.id,
        imageUrl: clothingItems.imageUrl,
      })
      .from(outfitItems)
      .innerJoin(
        clothingItems,
        eq(outfitItems.clothingItemId, clothingItems.id)
      )
      .where(eq(outfitItems.outfitId, outfitId));

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No items in outfit" },
        { status: 400 }
      );
    }

    // Create temp directory for this outfit
    const tempDir = path.join(process.cwd(), "collage", "temp", `outfit-${outfitId}`);
    const imagesDir = path.join(tempDir, "images");

    await fs.mkdir(imagesDir, { recursive: true });

    // Download all images
    console.log(`Downloading ${items.length} images...`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.imageUrl) continue;

      const ext = item.imageUrl.endsWith(".png") ? ".png" : ".jpg";
      const filename = `item-${item.id}${ext}`;
      const filepath = path.join(imagesDir, filename);

      await downloadImage(item.imageUrl, filepath);
      console.log(`Downloaded ${filename}`);
    }

    // Run arrange.py directly (skip extraction)
    console.log("Running arrange.py...");
    const collagePath = path.join(process.cwd(), "collage");

    const collageFilename = `outfit-${outfitId}.png`;
    const tempCollageOutputPath = path.join(tempDir, collageFilename);

    await execAsync(
      `cd "${collagePath}" && ./ve/bin/python arrange.py "${imagesDir}" "${tempCollageOutputPath}"`
    );

    // Upload to Google Cloud Storage
    console.log("Uploading collage to Google Cloud Storage...");
    const gcsPath = `collages/${collageFilename}`;
    const collageUrl = await uploadToGoogleStorage(tempCollageOutputPath, gcsPath);
    console.log(`Uploaded to: ${collageUrl}`);

    // Update outfit with Google Storage URL
    await db
      .update(outfits)
      .set({
        imageUrl: collageUrl,
        updatedAt: new Date(),
      })
      .where(eq(outfits.id, outfitId));

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return NextResponse.json({
      message: "Collage generated successfully",
      collageUrl,
    });
  } catch (error) {
    console.error("Error generating collage:", error);
    return NextResponse.json(
      {
        error: "Failed to generate collage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
