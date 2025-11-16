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
import { randomUUID } from "crypto";
import { uploadToGoogleStorage, deleteFromGoogleStorage } from "@/lib/google-storage";

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

    // Get outfit details (for inspiration photo)
    const [outfit] = await db
      .select()
      .from(outfits)
      .where(eq(outfits.id, outfitId))
      .limit(1);

    if (!outfit) {
      return NextResponse.json(
        { error: "Outfit not found" },
        { status: 404 }
      );
    }

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

    // Download all clothing item images
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

    // Download inspiration photo if it exists
    let inspirationPhotoPath = null;
    if (outfit.inspirationPhotoUrl) {
      try {
        console.log("Downloading inspiration photo...");
        const ext = outfit.inspirationPhotoUrl.endsWith(".png") ? ".png" : ".jpg";
        const inspirationFilename = `inspiration${ext}`;
        inspirationPhotoPath = path.join(tempDir, inspirationFilename);

        await downloadImage(outfit.inspirationPhotoUrl, inspirationPhotoPath);
        console.log(`Downloaded inspiration photo`);
      } catch (error) {
        console.error("Failed to download inspiration photo:", error);
        inspirationPhotoPath = null;
      }
    }

    // Run arrange.py
    console.log("Running arrange.py...");
    const collagePath = path.join(process.cwd(), "collage");

    const collageFilename = `outfit-${outfitId}-${randomUUID()}.png`;
    const tempCollageOutputPath = path.join(tempDir, collageFilename);

    // Build command with optional --inspiration flag
    let command = `cd "${collagePath}" && ./ve/bin/python arrange.py "${imagesDir}" "${tempCollageOutputPath}"`;
    if (inspirationPhotoPath) {
      command += ` --inspiration "${inspirationPhotoPath}"`;
    }

    await execAsync(command);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfitId = parseInt(id);

    // Get outfit to find the collage URL
    const [outfit] = await db
      .select()
      .from(outfits)
      .where(eq(outfits.id, outfitId))
      .limit(1);

    if (!outfit) {
      return NextResponse.json(
        { error: "Outfit not found" },
        { status: 404 }
      );
    }

    if (!outfit.imageUrl) {
      return NextResponse.json(
        { error: "No collage to delete" },
        { status: 400 }
      );
    }

    // Extract the GCS path from the URL
    // URL format: https://storage.googleapis.com/{bucket}/{path}
    const url = new URL(outfit.imageUrl);
    const pathParts = url.pathname.split('/');
    const gcsPath = pathParts.slice(2).join('/'); // Remove leading '/' and bucket name

    // Delete from Google Cloud Storage
    console.log(`Deleting collage from GCS: ${gcsPath}`);
    await deleteFromGoogleStorage(gcsPath);

    // Update outfit to remove collage URL
    await db
      .update(outfits)
      .set({
        imageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(outfits.id, outfitId));

    return NextResponse.json({
      message: "Collage deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting collage:", error);
    return NextResponse.json(
      {
        error: "Failed to delete collage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
