import { config } from "dotenv";
config();

import { sql } from "drizzle-orm";
import { db } from "../src/db/index.js";

async function createIndexes() {
  try {
    console.log("Creating vector similarity search indexes...");

    await db.execute(sql`CREATE INDEX IF NOT EXISTS clothing_items_embedding_idx ON clothing_items USING ivfflat (embedding vector_cosine_ops)`);
    console.log("✓ Created clothing_items_embedding_idx");

    await db.execute(sql`CREATE INDEX IF NOT EXISTS outfits_embedding_idx ON outfits USING ivfflat (embedding vector_cosine_ops)`);
    console.log("✓ Created outfits_embedding_idx");

    console.log("\n✓ All indexes created successfully!");
    console.log("\nYour database is now ready. You can run generate-embeddings.");

    process.exit(0);
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  }
}

createIndexes();
