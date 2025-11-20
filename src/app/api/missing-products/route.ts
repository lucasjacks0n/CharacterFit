import { NextResponse } from "next/server";
import { db } from "@/db";
import { missingProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST - Create missing products
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { outfitId, products } = body;

    if (!outfitId || !products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "outfitId and products array are required" },
        { status: 400 }
      );
    }

    // Insert all missing products
    const insertedProducts = await Promise.all(
      products.map(async (product: { productName: string; originalAmazonUrl: string }) => {
        const [inserted] = await db
          .insert(missingProducts)
          .values({
            outfitId,
            productName: product.productName,
            originalAmazonUrl: product.originalAmazonUrl,
            status: "pending",
          })
          .returning();
        return inserted;
      })
    );

    return NextResponse.json({
      success: true,
      count: insertedProducts.length,
      products: insertedProducts,
    });
  } catch (error) {
    console.error("Error creating missing products:", error);
    return NextResponse.json(
      {
        error: "Failed to create missing products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET - Fetch missing products for an outfit
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outfitId = searchParams.get("outfitId");

    if (!outfitId) {
      return NextResponse.json(
        { error: "outfitId query parameter is required" },
        { status: 400 }
      );
    }

    const products = await db
      .select()
      .from(missingProducts)
      .where(eq(missingProducts.outfitId, parseInt(outfitId)));

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching missing products:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch missing products",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
