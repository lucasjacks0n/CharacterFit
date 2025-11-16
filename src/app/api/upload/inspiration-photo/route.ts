import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { uploadToGoogleStorage } from "@/lib/google-storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create temp file path
    const fileExtension = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const tempFileName = `inspiration-${timestamp}.${fileExtension}`;
    const tempFilePath = path.join("/tmp", tempFileName);

    // Write file to temp location
    await writeFile(tempFilePath, buffer);

    // Upload to Google Cloud Storage
    const gcsPath = `inspiration-photos/${tempFileName}`;
    const publicUrl = await uploadToGoogleStorage(tempFilePath, gcsPath);

    // Clean up temp file
    const fs = require("fs/promises");
    await fs.unlink(tempFilePath).catch(() => {});

    return NextResponse.json({
      url: publicUrl,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
