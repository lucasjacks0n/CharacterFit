// Script to apply vector embedding migration directly
import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function applyMigration() {
  try {
    console.log("Applying vector embedding migration...");

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      "../drizzle/0006_add_vector_embeddings.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      await db.execute(sql.raw(statement));
    }

    console.log("✓ Migration applied successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Install Python dependencies: pip install sentence-transformers psycopg2-binary");
    console.log("2. Generate embeddings: python scripts/generate-embeddings.py");
    console.log("3. Test search: curl http://localhost:3000/api/search?q=red+dress");

    process.exit(0);
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  }
}

applyMigration();
