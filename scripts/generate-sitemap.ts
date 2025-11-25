/**
 * Standalone sitemap generator script
 * Generates a static sitemap.xml file in the public directory
 *
 * Run with: npx dotenv -- npx tsx scripts/generate-sitemap.ts
 */

import { db } from "../src/db";
import { outfits } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://characterfits.com";

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSitemapXml(urls: SitemapURL[]): string {
  const urlEntries = urls
    .map((url) => {
      let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;

      if (url.lastmod) {
        entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      }

      if (url.changefreq) {
        entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      }

      if (url.priority !== undefined) {
        entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
      }

      entry += `\n  </url>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

async function main() {
  console.log("Generating sitemap.xml...\n");

  const urls: SitemapURL[] = [];

  // Add homepage
  urls.push({
    loc: BASE_URL,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 1.0,
  });

  // Add search page
  urls.push({
    loc: `${BASE_URL}/search`,
    lastmod: new Date().toISOString(),
    changefreq: "weekly",
    priority: 0.7,
  });

  // Add terms page
  urls.push({
    loc: `${BASE_URL}/terms`,
    lastmod: new Date().toISOString(),
    changefreq: "monthly",
    priority: 0.3,
  });

  // Add privacy page
  urls.push({
    loc: `${BASE_URL}/privacy`,
    lastmod: new Date().toISOString(),
    changefreq: "monthly",
    priority: 0.3,
  });

  // Fetch approved outfits with slugs
  console.log("Fetching approved outfits...");
  const approvedOutfits = await db
    .select({
      slug: outfits.slug,
      updatedAt: outfits.updatedAt,
    })
    .from(outfits)
    .where(eq(outfits.status, 1));

  console.log(`Found ${approvedOutfits.length} approved outfits\n`);

  // Add outfit URLs
  const outfitsWithSlugs = approvedOutfits.filter((outfit) => outfit.slug !== null);

  for (const outfit of outfitsWithSlugs) {
    urls.push({
      loc: `${BASE_URL}/outfits/${outfit.slug}`,
      lastmod: outfit.updatedAt.toISOString(),
      changefreq: "weekly",
      priority: 0.8,
    });
  }

  console.log(`Added ${outfitsWithSlugs.length} outfit URLs to sitemap`);

  if (outfitsWithSlugs.length < approvedOutfits.length) {
    const missing = approvedOutfits.length - outfitsWithSlugs.length;
    console.warn(`⚠️  Warning: ${missing} approved outfits are missing slugs and were excluded`);
  }

  // Generate XML
  const sitemapXml = generateSitemapXml(urls);

  // Write to public directory
  const publicDir = path.join(process.cwd(), "public");
  const sitemapPath = path.join(publicDir, "sitemap.xml");

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(sitemapPath, sitemapXml, "utf8");

  console.log(`\n✓ Sitemap generated successfully!`);
  console.log(`  Location: ${sitemapPath}`);
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`    - Static pages: 4`);
  console.log(`    - Outfit pages: ${outfitsWithSlugs.length}`);
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Error generating sitemap:", error);
    process.exit(1);
  });
