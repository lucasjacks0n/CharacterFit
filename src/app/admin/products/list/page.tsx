"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  material: string | null;
  price: string | null;
  imageUrl: string | null;
  createdAt: string;
  outfitCount: number;
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/clothing-items/list");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setMessage("❌ Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: number, productTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${productTitle}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clothing-items/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage(`✅ Deleted "${productTitle}"`);
        fetchProducts();
      } else {
        const error = await response.json();
        throw new Error(error.details || "Failed to delete product");
      }
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back to Admin */}
        <Link
          href="/admin"
          className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-6"
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
          Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">Manage your clothing catalog</p>
          </div>
          <Link
            href="/admin/import"
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            Import New Product
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.includes("❌")
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-4">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No products yet
            </h2>
            <p className="text-gray-600 mb-6">
              Import your first product from Amazon to get started
            </p>
            <Link
              href="/admin/import"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Import Product
            </Link>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div className="bg-gray-100 aspect-square">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.title}
                  </h3>

                  {product.brand && (
                    <p className="text-xs text-gray-600 mb-2">{product.brand}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.category && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {product.category}
                      </span>
                    )}
                    {product.color && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {product.color}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    {product.price && (
                      <p className="text-lg font-bold text-gray-900">
                        ${product.price}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <span>{product.outfitCount} outfit{product.outfitCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/products/edit/${product.id}`}
                      className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.title)}
                      className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
