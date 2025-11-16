"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  color: string | null;
}

interface Outfit {
  id: number;
  name: string;
  description: string | null;
  occasion: string | null;
  season: string | null;
  imageUrl: string | null;
  inspirationPhotoUrl: string | null;
  createdAt: string;
  items?: ClothingItem[];
}

export default function OutfitsListPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Fetch all outfits
  useEffect(() => {
    fetchOutfits();
  }, []);

  const fetchOutfits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/outfits/list");
      if (response.ok) {
        const data = await response.json();
        setOutfits(data);
      }
    } catch (error) {
      console.error("Failed to fetch outfits:", error);
      setMessage("❌ Failed to load outfits");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (outfitId: number, outfitName: string) => {
    if (!confirm(`Are you sure you want to delete "${outfitName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/outfits/${outfitId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage(`✅ Deleted "${outfitName}"`);
        fetchOutfits(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.details || "Failed to delete outfit");
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
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6"
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
            <h1 className="text-3xl font-bold text-gray-900">Outfits</h1>
            <p className="text-gray-600 mt-1">Manage your outfit combinations</p>
          </div>
          <Link
            href="/admin/outfits"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Create New Outfit
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Loading outfits...</p>
          </div>
        ) : outfits.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👔</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No outfits yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first outfit combination to get started
            </p>
            <Link
              href="/admin/outfits"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create Outfit
            </Link>
          </div>
        ) : (
          /* Outfits Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => (
              <div
                key={outfit.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Outfit Photo or Items Preview */}
                <div className="bg-gray-100 p-4">
                  {outfit.inspirationPhotoUrl ? (
                    /* Show inspiration photo if available */
                    <div className="aspect-[4/5]">
                      <img
                        src={outfit.inspirationPhotoUrl}
                        alt={outfit.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ) : outfit.imageUrl ? (
                    /* Show collage if available */
                    <div className="aspect-[4/5]">
                      <img
                        src={outfit.imageUrl}
                        alt={outfit.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ) : outfit.items && outfit.items.length > 0 ? (
                    /* Fallback to item grid */
                    <div className="grid grid-cols-3 gap-2">
                      {outfit.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="aspect-square">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {outfit.items.length > 3 && (
                        <div className="aspect-square bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            +{outfit.items.length - 3}
                          </span>
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
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {outfit.name}
                  </h3>

                  {outfit.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {outfit.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {outfit.occasion && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {outfit.occasion}
                      </span>
                    )}
                    {outfit.season && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {outfit.season}
                      </span>
                    )}
                    {outfit.items && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {outfit.items.length} items
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/outfits/edit/${outfit.id}`}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(outfit.id, outfit.name)}
                      className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100 transition-colors"
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
