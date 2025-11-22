import { db } from "@/db";
import { outfits, outfitItems, clothingItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { OutfitContent } from "./outfit-content";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const outfitId = parseInt(id);

  // Fetch outfit details
  const [outfit] = await db
    .select()
    .from(outfits)
    .where(eq(outfits.id, outfitId))
    .limit(1);

  if (!outfit) {
    return {
      title: "Outfit Not Found - CharacterFits",
    };
  }

  // Fetch outfit items for item count
  const items = await db
    .select({
      id: clothingItems.id,
      title: clothingItems.title,
    })
    .from(outfitItems)
    .innerJoin(clothingItems, eq(outfitItems.clothingItemId, clothingItems.id))
    .where(eq(outfitItems.outfitId, outfitId));

  const description =
    outfit.description ||
    `${outfit.name} - A ${items.length}-piece outfit ${
      outfit.occasion ? `for ${outfit.occasion}` : ""
    } ${outfit.season ? `perfect for ${outfit.season}` : ""}`.trim();

  return {
    title: `${outfit.name} - CharacterFits`,
    description,
    keywords: [
      outfit.name,
      "outfit",
      "character outfit",
      outfit.occasion || "",
      outfit.season || "",
      "costume",
      "clothing",
    ].filter(Boolean),
    openGraph: {
      title: `${outfit.name} - CharacterFits`,
      description,
      type: "website",
      images: outfit.imageUrl
        ? [
            {
              url: outfit.imageUrl,
              width: 1640,
              height: 1000,
              alt: outfit.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${outfit.name} - CharacterFits`,
      description,
      images: outfit.imageUrl ? [outfit.imageUrl] : undefined,
    },
  };
}

export default async function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfitId = parseInt(id);

  // Check if user is admin
  const { sessionClaims } = await auth();
  const isAdmin = sessionClaims?.metadata?.role === "admin";

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
      displayTitle: clothingItems.displayTitle,
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

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: outfitWithItems.name,
    description: outfitWithItems.description,
    numberOfItems: outfitWithItems.items.length,
    itemListElement: outfitWithItems.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: item.title,
        image: item.imageUrl,
        ...(item.productUrl && { url: item.productUrl }),
        ...(item.brand && { brand: { "@type": "Brand", name: item.brand } }),
        ...(item.color && { color: item.color }),
        ...(item.price && {
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "USD",
          },
        }),
      },
    })),
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <OutfitContent outfit={outfitWithItems} isAdmin={isAdmin} />
    </>
  );
}
