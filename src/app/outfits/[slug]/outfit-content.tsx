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

interface OutfitSection {
  id: number;
  sectionType: string;
  heading: string | null;
  content: string;
  metaJson: string | null;
}

interface OutfitContentProps {
  outfit: OutfitWithItems;
  sections: OutfitSection[];
  isAdmin?: boolean;
}

// Section Components
const CollageSection = ({
  outfit,
  hoveredItemId,
  onItemHover,
}: {
  outfit: OutfitWithItems;
  hoveredItemId: number | null;
  onItemHover: (id: number | null) => void;
}) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
    {outfit.imageUrl ? (
      <ClickableCollage
        imageUrl={outfit.imageUrl}
        collageMetadata={outfit.collageMetadata}
        items={outfit.items}
        altText={outfit.name}
        hoveredItemId={hoveredItemId}
        onItemHover={onItemHover}
      />
    ) : (
      <div className="aspect-4/5 bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400">No collage available</span>
      </div>
    )}
  </div>
);

const TagsSection = ({ outfit }: { outfit: OutfitWithItems }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
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
);

const AboutSection = ({
  section,
  outfitName,
}: {
  section: OutfitSection | undefined;
  outfitName: string;
}) => {
  if (!section) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3">
        {section.heading || `About ${outfitName}`}
      </h2>
      <p className="text-gray-700 leading-relaxed">{section.content}</p>
    </div>
  );
};

const ItemsSection = ({
  items,
  hoveredItemId,
  onItemHover,
  outfitName,
}: {
  items: ClothingItem[];
  hoveredItemId: number | null;
  onItemHover: (id: number | null) => void;
  outfitName: string;
}) => (
  <div>
    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
      {outfitName} Outfit Items
    </h2>

    {items.length === 0 ? (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <p className="text-gray-600">No items in this outfit</p>
      </div>
    ) : (
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg shadow-sm overflow-hidden transition-all ${
              hoveredItemId === item.id
                ? "bg-orange-50"
                : "bg-white hover:shadow-md"
            }`}
            onMouseEnter={() => onItemHover(item.id)}
            onMouseLeave={() => onItemHover(null)}
          >
            <div className="flex">
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.displayTitle}
                  </h3>

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
);

const CostumeGuideSection = ({
  section,
  outfitName,
}: {
  section: OutfitSection | undefined;
  outfitName: string;
}) => {
  if (!section) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3">
        Complete {outfitName} Costume Guide
      </h2>
      <p className="text-gray-700 leading-relaxed">{section.content}</p>
    </div>
  );
};

export function OutfitContent({
  outfit,
  sections,
  isAdmin,
}: OutfitContentProps) {
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

  const aboutSection = sections.find(
    (s) => s.sectionType === "about_character"
  );
  const costumeGuideSection = sections.find(
    (s) => s.sectionType === "costume_guide"
  );

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

        {/* Mobile Layout - Single column with custom order */}
        <div className="lg:hidden space-y-8">
          <CollageSection
            outfit={outfit}
            hoveredItemId={hoveredItemId}
            onItemHover={setHoveredItemId}
          />
          <TagsSection outfit={outfit} />
          <ItemsSection
            items={outfit.items}
            hoveredItemId={hoveredItemId}
            onItemHover={setHoveredItemId}
            outfitName={outfit.name}
          />
          <CostumeGuideSection
            section={costumeGuideSection}
            outfitName={outfit.name}
          />
          <AboutSection section={aboutSection} outfitName={outfit.name} />
        </div>

        {/* Desktop Layout - 2 column grid */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-8">
          {/* Left Column - Collage, About Character, Tags (sticky) */}
          <div>
            <div className="sticky top-8 space-y-8">
              <CollageSection
                outfit={outfit}
                hoveredItemId={hoveredItemId}
                onItemHover={setHoveredItemId}
              />
              <AboutSection section={aboutSection} outfitName={outfit.name} />
            </div>
          </div>

          {/* Right Column - Items and Costume Guide */}
          <div className="space-y-8">
            <ItemsSection
              items={outfit.items}
              hoveredItemId={hoveredItemId}
              onItemHover={setHoveredItemId}
              outfitName={outfit.name}
            />
            <CostumeGuideSection
              section={costumeGuideSection}
              outfitName={outfit.name}
            />
          </div>
        </div>

        {/* Fast Facts Section - Full Width Below Grid */}
        {sections.find((s) => s.sectionType === "fast_facts") &&
          (() => {
            const fastFactsSection = sections.find(
              (s) => s.sectionType === "fast_facts"
            );
            const facts = fastFactsSection?.metaJson
              ? JSON.parse(fastFactsSection.metaJson)
              : [];

            return (
              <div className="mt-12 bg-white rounded-lg shadow-sm p-8 border-l-4 border-orange-500">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {fastFactsSection?.heading || "Fast Facts"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {facts.map(
                    (fact: { label: string; value: string }, idx: number) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-1">
                          {fact.label}
                        </span>
                        <span className="text-gray-700">{fact.value}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })()}
      </main>
    </div>
  );
}
