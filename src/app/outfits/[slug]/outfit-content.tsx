"use client";

import { useState } from "react";
import Link from "next/link";
import { ClickableCollage } from "./clickable-collage";
import { SiteHeader } from "@/components/site-header";

interface ClothingItem {
  id: number;
  title: string;
  displayTitle: string | null;
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
  collageMetadata: string | null;
  createdAt: Date;
  items: ClothingItem[];
}

interface OutfitContentProps {
  outfit: OutfitWithItems;
  isAdmin?: boolean;
}

export function OutfitContent({ outfit, isAdmin }: OutfitContentProps) {
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <SiteHeader
        isAdmin={isAdmin}
        showAdminButton={true}
        adminButtonHref={`/admin/outfits/edit/${outfit.id}`}
        adminButtonText="Edit Outfit"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title - H1 for SEO */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How to Dress Like {outfit.name}
          </h1>
          <p className="text-lg text-gray-600">
            Complete costume guide with curated outfit pieces and accessories
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Outfit Collage */}
          <div>
            <div className="bg-white rounded-lg shadow-sm sticky top-8">
              <div className="overflow-hidden rounded-t-lg">
                {outfit.imageUrl ? (
                  <ClickableCollage
                    imageUrl={outfit.imageUrl}
                    collageMetadata={outfit.collageMetadata}
                    items={outfit.items}
                    altText={outfit.name}
                    hoveredItemId={hoveredItemId}
                    onItemHover={setHoveredItemId}
                  />
                ) : (
                  <div className="aspect-4/5 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No collage available</span>
                  </div>
                )}
              </div>

              {/* Outfit Description */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Best {outfit.name} Costume Guide
                </h2>
                {outfit.description && (
                  <p className="text-gray-600">{outfit.description}</p>
                )}
              </div>

              {/* Tags */}
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {outfit.occasion && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {outfit.occasion}
                    </span>
                  )}
                  {outfit.season && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {outfit.season}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                    {outfit.items.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items List */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {outfit.name} Outfit Items
            </h2>

            {outfit.items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">No items in this outfit</p>
              </div>
            ) : (
              <div className="space-y-4">
                {outfit.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg shadow-sm overflow-hidden transition-all ${
                      hoveredItemId === item.id
                        ? "bg-orange-50"
                        : "bg-white hover:shadow-md"
                    }`}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <div className="flex">
                      {/* Item Details */}
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {item.displayTitle}
                          </h3>

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
                              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors whitespace-nowrap"
                            >
                              View Product
                            </a>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          {item.category && (
                            <p>
                              <span className="font-medium">Category:</span>{" "}
                              {item.category}
                            </p>
                          )}
                        </div>
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
