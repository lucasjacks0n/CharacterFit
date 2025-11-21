/**
 * Utility functions for generating embeddings
 * Use these when creating/updating clothing items or outfits
 */

import { pipeline } from "@xenova/transformers";

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embedder;
}

/**
 * Generate an embedding vector from text
 * Returns a vector string formatted for pgvector: "[0.1,0.2,...]"
 */
export async function generateEmbedding(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    // Return zero vector for empty text
    return "[" + Array(384).fill(0).join(",") + "]";
  }

  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  const embedding: number[] = Array.from(output[0].data);

  return `[${embedding.join(",")}]`;
}

/**
 * Generate embedding for a clothing item (based on title)
 */
export async function generateClothingItemEmbedding(title: string): Promise<string> {
  return generateEmbedding(title);
}

/**
 * Generate embedding for an outfit (based on name)
 */
export async function generateOutfitEmbedding(name: string): Promise<string> {
  return generateEmbedding(name);
}
