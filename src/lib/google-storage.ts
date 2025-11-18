import { Storage } from "@google-cloud/storage";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import os from "os";

// Initialize Google Cloud Storage client
const getStorageClient = () => {
  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS environment variable is not set");
  }

  if (!process.env.GOOGLE_CLOUD_BUCKET) {
    throw new Error("GOOGLE_CLOUD_BUCKET environment variable is not set");
  }

  // Decode base64 credentials
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_CLOUD_CREDENTIALS, "base64").toString("utf-8")
  );

  return new Storage({
    projectId: credentials.project_id,
    credentials,
  });
};

/**
 * Upload a file to Google Cloud Storage
 * @param localFilePath - Path to the local file to upload
 * @param destinationPath - Path in GCS bucket (e.g., "collages/outfit-123.png")
 * @returns Public URL of the uploaded file
 */
export async function uploadToGoogleStorage(
  localFilePath: string,
  destinationPath: string
): Promise<string> {
  const storage = getStorageClient();
  const bucketName = process.env.GOOGLE_CLOUD_BUCKET!;
  const bucket = storage.bucket(bucketName);

  // Upload the file
  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      cacheControl: "public, max-age=31536000", // Cache for 1 year
    },
  });

  // Return the public URL
  // Note: Bucket must be configured with public access via IAM permissions
  // See: https://cloud.google.com/storage/docs/access-control/making-data-public#buckets
  return `https://storage.googleapis.com/${bucketName}/${destinationPath}`;
}

/**
 * Delete a file from Google Cloud Storage
 * @param filePath - Path in GCS bucket (e.g., "collages/outfit-123.png")
 */
export async function deleteFromGoogleStorage(
  filePath: string
): Promise<void> {
  const storage = getStorageClient();
  const bucketName = process.env.GOOGLE_CLOUD_BUCKET!;
  const bucket = storage.bucket(bucketName);

  await bucket.file(filePath).delete();
}

/**
 * Download an image from a URL and upload it to Google Cloud Storage
 * @param imageUrl - URL of the image to download
 * @param destinationPath - Path in GCS bucket (e.g., "product-images/item-123.jpg")
 * @returns Public URL of the uploaded file
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  destinationPath: string
): Promise<string> {
  // Create a temporary file path
  const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.jpg`);

  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Save to temporary file
    const fileStream = createWriteStream(tempFilePath);
    // Convert the Response body to a Node.js readable stream
    const nodeStream = Readable.fromWeb(response.body as any);
    await pipeline(nodeStream, fileStream);

    // Upload to GCS
    const publicUrl = await uploadToGoogleStorage(tempFilePath, destinationPath);

    return publicUrl;
  } finally {
    // Clean up temporary file
    try {
      await unlink(tempFilePath);
    } catch (error) {
      console.error("Failed to delete temporary file:", error);
    }
  }
}
