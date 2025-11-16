import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  price: string | null;
  color: string | null;
  imageUrl: string | null;
  category: string | null;
  productUrl: string | null;
}

interface OutfitWithItems {
  id: number;
  name: string;
  description: string | null;
  occasion: string | null;
  season: string | null;
  imageUrl: string | null;
  inspirationPhotoUrl: string | null;
  createdAt: Date;
  items: ClothingItem[];
}

export default async function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfitId = parseInt(id);

  // Fetch outfit details
  const [outfit] = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, outfitId))
    .limit(1);

  if (!outfit) {
    notFound();
  }

  // Fetch outfit items
  const items = await db
    .select({
      id: clothingItems.id,
      title: clothingItems.title,
      brand: clothingItems.brand,
      price: clothingItems.price,
      color: clothingItems.color,
      imageUrl: clothingItems.imageUrl,
      category: clothingItems.category,
      productUrl: clothingItems.productUrl,
    })
    .from(outfitItems)
    .innerJoin(clothingItems, eq(outfitItems.clothingItemId, clothingItems.id))
    .where(eq(outfitItems.outfitId, outfitId));

  const outfitWithItems: OutfitWithItems = {
    ...outfit,
    items,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {outfitWithItems.name}
          </h1>
          {outfitWithItems.description && (
            <p className="text-gray-600 mt-2">{outfitWithItems.description}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Outfit Collage */}
          <div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8">
              {outfitWithItems.imageUrl ? (
                <img
                  src={outfitWithItems.imageUrl}
                  alt={outfitWithItems.name}
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-4/5 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No collage available</span>
                </div>
              )}

              {/* Tags */}
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {outfitWithItems.occasion && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {outfitWithItems.occasion}
                    </span>
                  )}
                  {outfitWithItems.season && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {outfitWithItems.season}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                    {outfitWithItems.items.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items List */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Outfit Items
            </h2>

            {outfitWithItems.items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">No items in this outfit</p>
              </div>
            ) : (
              <div className="space-y-4">
                {outfitWithItems.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="flex">
                      {/* Item Image */}
                      <div className="w-32 h-32 shrink-0 bg-gray-100">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.title}
                        </h3>

                        <div className="space-y-1 text-sm text-gray-600">
                          {item.color && (
                            <p>
                              <span className="font-medium">Color:</span>{" "}
                              {item.color}
                            </p>
                          )}
                          {item.category && (
                            <p>
                              <span className="font-medium">Category:</span>{" "}
                              {item.category}
                            </p>
                          )}
                        </div>

                        {/* View Product Button */}
                        {item.productUrl && (
                          <a
                            href={
                              item.productUrl.includes("amazon.com")
                                ? `${item.productUrl}${
                                    item.productUrl.includes("?") ? "&" : "?"
                                  }tag=characterfits-20`
                                : item.productUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                          >
                            View Product
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
