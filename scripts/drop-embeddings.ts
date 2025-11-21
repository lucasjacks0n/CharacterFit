import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db/index.js";
import { sql } from "drizzle-orm";

async function dropEmbeddings() {
  try {
    console.log("Dropping existing embedding columns...");
    await db.execute(sql`ALTER TABLE clothing_items DROP COLUMN IF EXISTS embedding`);
    await db.execute(sql`ALTER TABLE outfits DROP COLUMN IF EXISTS embedding`);
    console.log("✓ Columns dropped successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

dropEmbeddings();
