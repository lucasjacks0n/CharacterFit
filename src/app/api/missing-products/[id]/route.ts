import { NextResponse } from "next/server";
import { db } from "@/db";
import { missingProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT - Update a missing product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { replacementUrl, status } = body;
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const updateData: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };

    if (replacementUrl !== undefined) {
      updateData.replacementUrl = replacementUrl;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const [updated] = await db
      .update(missingProducts)
      .set(updateData)
      .where(eq(missingProducts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Missing product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error("Error updating missing product:", error);
    return NextResponse.json(
      {
        error: "Failed to update missing product",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a missing product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(missingProducts)
      .where(eq(missingProducts.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Missing product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting missing product:", error);
    return NextResponse.json(
      {
        error: "Failed to delete missing product",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
