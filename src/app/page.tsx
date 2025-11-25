import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { OutfitCard } from "@/components/outfit-card";

interface Outfit {
  slug: string;
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  console.log("load home page");
  const { userId, sessionClaims } = await auth();
  const isAdmin = sessionClaims?.metadata?.role === "admin";

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 32;
  const offset = (page - 1) * limit;

  // Get total count of approved outfits
  const [{ total }] = await db
    .select({ total: count() })
    .from(outfits)
    .where(eq(outfits.status, 1));

  // Fetch paginated approved outfits (only those with slugs)
  const allOutfits = await db
    .select({
      id: outfits.id, // Only for internal use (fetching items)
      slug: outfits.slug,
      name: outfits.name,
      description: outfits.description,
      occasion: outfits.occasion,
      season: outfits.season,
      imageUrl: outfits.imageUrl,
      inspirationPhotoUrl: outfits.inspirationPhotoUrl,
      createdAt: outfits.createdAt,
    })
    .from(outfits)
    .where(sql`${outfits.status} = 1 AND ${outfits.slug} IS NOT NULL`)
    .orderBy(desc(outfits.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

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
        slug: outfit.slug!,
        name: outfit.name,
        description: outfit.description,
        occasion: outfit.occasion,
        season: outfit.season,
        imageUrl: outfit.imageUrl,
        inspirationPhotoUrl: outfit.inspirationPhotoUrl,
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
    <div className="min-h-screen bg-white">
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
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            of {total} outfits
          </p>
        </div>

        {outfitsWithItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">
              No outfits yet. Sign in to create your first outfit!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {outfitsWithItems.map((outfit) => (
                <OutfitCard key={outfit.slug} outfit={outfit} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {hasPrevPage ? (
                  <Link
                    href={`/?page=${page - 1}`}
                    className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-md border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                    Previous
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Link
                        key={pageNum}
                        href={`/?page=${pageNum}`}
                        className={`px-4 py-2 rounded-md ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {hasNextPage ? (
                  <Link
                    href={`/?page=${page + 1}`}
                    className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-md border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                    Next
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
