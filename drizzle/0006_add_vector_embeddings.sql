-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding vector column to clothing_items table
ALTER TABLE "clothing_items" ADD COLUMN "embedding" vector(384);

-- Add embedding vector column to outfits table
ALTER TABLE "outfits" ADD COLUMN "embedding" vector(384);

-- Create index for faster vector similarity search on clothing_items
CREATE INDEX IF NOT EXISTS "clothing_items_embedding_idx" ON "clothing_items" USING ivfflat ("embedding" vector_cosine_ops);

-- Create index for faster vector similarity search on outfits
CREATE INDEX IF NOT EXISTS "outfits_embedding_idx" ON "outfits" USING ivfflat ("embedding" vector_cosine_ops);
