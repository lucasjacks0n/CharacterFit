import { MetadataRoute } from "next";
import { db } from "@/db";
import { outfits } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://characterfits.com";

  // Fetch all outfits
  const allOutfits = await db.select({ id: outfits.id, updatedAt: outfits.updatedAt }).from(outfits);

  // Create outfit URLs
  const outfitUrls = allOutfits.map((outfit) => ({
    url: `${baseUrl}/outfits/${outfit.id}`,
    lastModified: outfit.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...outfitUrls,
  ];
}
