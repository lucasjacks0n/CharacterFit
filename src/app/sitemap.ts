import { MetadataRoute } from "next";
import { db } from "@/db";
import { outfits } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://characterfits.com";

  // Fetch only approved outfits (status = 1) with slugs
  const approvedOutfits = await db
    .select({
      slug: outfits.slug,
      updatedAt: outfits.updatedAt,
    })
    .from(outfits)
    .where(eq(outfits.status, 1));

  // Create outfit URLs using slugs
  const outfitUrls = approvedOutfits
    .filter((outfit) => outfit.slug !== null) // Only include outfits with slugs
    .map((outfit) => ({
      url: `${baseUrl}/outfits/${outfit.slug}`,
      lastModified: outfit.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    // Search page
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Terms page
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Privacy page
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Approved outfit pages
    ...outfitUrls,
  ];
}
