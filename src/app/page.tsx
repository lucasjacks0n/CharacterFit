import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { OutfitCard } from "@/components/outfit-card";

interface Outfit {
  id: number;
  name: string;
  description: string | null;
  occasion: string | null;
  season: string | null;
  imageUrl: string | null;
  inspirationPhotoUrl: string | null;
  items: {
    id: number;
    title: string;
    imageUrl: string | null;
  }[];
}

export const metadata: Metadata = {
  title: "CharacterFits - Character Costume & Cosplay Outfit Builder",
  description:
    "Create and discover character-inspired costumes and cosplay outfits. Browse curated character costumes with clickable product links to shop the look.",
  keywords: [
    "character costumes",
    "cosplay outfits",
    "costume builder",
    "character outfits",
    "costume ideas",
    "cosplay inspiration",
    "halloween costumes",
    "character fashion",
  ],
  openGraph: {
    title: "CharacterFits - Character Costume & Cosplay Outfit Builder",
    description:
      "Create and discover character-inspired costumes and cosplay outfits. Shop curated character costumes with clickable product links.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CharacterFits - Character Costume & Cosplay Outfit Builder",
    description:
      "Create and discover character-inspired costumes and cosplay outfits. Shop curated character costumes with clickable product links.",
  },
};

export default async function Home() {
  console.log("load home page");
  const { userId, sessionClaims } = await auth();
  const isAdmin = sessionClaims?.metadata?.role === "admin";

  // Fetch 12 most recent approved outfits
  const allOutfits = await db
    .select()
    .from(outfits)
    .where(eq(outfits.status, 1))
    .orderBy(desc(outfits.createdAt))
    .limit(12);

  // For each outfit, get its items
  const outfitsWithItems: Outfit[] = await Promise.all(
    allOutfits.map(async (outfit) => {
      const items = await db
        .select({
          id: clothingItems.id,
          title: clothingItems.title,
          imageUrl: clothingItems.imageUrl,
        })
        .from(outfitItems)
        .innerJoin(
          clothingItems,
          eq(outfitItems.clothingItemId, clothingItems.id)
        )
        .where(eq(outfitItems.outfitId, outfit.id));

      return {
        ...outfit,
        items,
      };
    })
  );

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CharacterFits",
    description: "Character Costume & Cosplay Builder",
    url: "https://characterfits.com",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <SiteHeader isAdmin={isAdmin} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Recent Outfits
          </h2>
          <p className="text-gray-600 mt-1">
            Check out our latest outfit combinations
          </p>
        </div>

        {outfitsWithItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">
              No outfits yet. Sign in to create your first outfit!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfitsWithItems.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
