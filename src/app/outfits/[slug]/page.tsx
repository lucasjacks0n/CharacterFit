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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Fetch outfit details by slug
  const [outfit] = await db
    .select()
    .from(outfits)
    .where(eq(outfits.slug, slug))
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
    .where(eq(outfitItems.outfitId, outfit.id));

  const description =
    outfit.description ||
    `Complete ${outfit.name} costume guide. Get the perfect ${outfit.name} look with our curated outfit pieces, styling tips, and character-inspired accessories. ${
      outfit.occasion ? `Perfect for ${outfit.occasion}.` : ""
    } ${outfit.season ? `Ideal for ${outfit.season}.` : ""}`.trim();

  return {
    title: `How to Dress Like ${outfit.name} | Costume Guide | CharacterFits`,
    description,
    keywords: [
      `${outfit.name} costume`,
      `how to dress like ${outfit.name}`,
      `${outfit.name} cosplay`,
      `${outfit.name} outfit guide`,
      `DIY ${outfit.name} costume`,
      `${outfit.name} halloween costume`,
      outfit.occasion || "",
      outfit.season || "",
      "character costume",
      "cosplay guide",
    ].filter(Boolean),
    openGraph: {
      title: `How to Dress Like ${outfit.name} | Costume Guide`,
      description,
      type: "article",
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
      title: `How to Dress Like ${outfit.name} | Costume Guide`,
      description,
      images: outfit.imageUrl ? [outfit.imageUrl] : undefined,
    },
  };
}

export default async function OutfitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Check if user is admin
  console.log("fetch outfit", slug);
  const { sessionClaims } = await auth();
  const isAdmin = sessionClaims?.metadata?.role === "admin";

  // Fetch outfit details by slug
  const [outfit] = await db
    .select()
    .from(outfits)
    .where(eq(outfits.slug, slug))
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
    .where(eq(outfitItems.outfitId, outfit.id));

  const outfitWithItems: OutfitWithItems = {
    ...outfit,
    items,
  };

  // Structured data for SEO
  const baseUrl = "https://characterfits.com";

  // Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `How to Dress Like ${outfitWithItems.name}`,
    description: outfitWithItems.description || `Complete costume guide for ${outfitWithItems.name}`,
    image: outfitWithItems.imageUrl || outfitWithItems.inspirationPhotoUrl,
    datePublished: outfitWithItems.createdAt.toISOString(),
    dateModified: outfitWithItems.createdAt.toISOString(),
    author: {
      "@type": "Organization",
      name: "CharacterFits",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "CharacterFits",
      url: baseUrl,
    },
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Outfits",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: outfitWithItems.name,
        item: `${baseUrl}/outfits/${slug}`,
      },
    ],
  };

  // ItemList Schema (existing product list)
  const itemListSchema = {
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
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Product List Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <OutfitContent outfit={outfitWithItems} isAdmin={isAdmin} />
    </>
  );
}
