import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { Metadata } from "next";

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

  // Fetch 12 most recent outfits
  const allOutfits = await db
    .select()
    .from(outfits)
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CharacterFits</h1>
            <p className="text-gray-600 mt-1">Character Costume & Cosplay Builder</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Admin Dashboard
              </Link>
            )}
            {userId && <UserButton afterSignOutUrl="/" />}
          </div>
        </div>
      </header>

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
              <Link
                key={outfit.id}
                href={`/outfits/${outfit.id}`}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow block"
              >
                {/* Outfit Photo or Items Preview */}
                <div className="bg-gray-100 p-4">
                  {outfit.imageUrl ? (
                    /* Show collage (merged with inspiration) if available */
                    <div className="w-full">
                      <img
                        src={outfit.imageUrl}
                        alt={outfit.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ) : outfit.items.length > 0 ? (
                    /* Fallback to item grid */
                    <div className="grid grid-cols-3 gap-2">
                      {outfit.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="aspect-square bg-gray-200 rounded"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                        </div>
                      ))}
                      {outfit.items.length > 3 && (
                        <div className="aspect-square bg-gray-300 rounded flex items-center justify-center text-gray-600 text-sm font-medium">
                          +{outfit.items.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No image or items */
                    <div className="aspect-[4/5] bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>

                {/* Outfit Details */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {outfit.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {outfit.occasion && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {outfit.occasion}
                      </span>
                    )}
                    {outfit.season && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        {outfit.season}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
