"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OutfitCard } from "@/components/outfit-card";

interface SearchResult {
  items?: {
    id: number;
    title: string;
    brand: string | null;
    category: string | null;
    color: string | null;
    price: string | null;
    imageUrl: string | null;
    productUrl: string | null;
    similarity: number;
  }[];
  outfits?: {
    slug: string;
    name: string;
    description: string | null;
    occasion: string | null;
    season: string | null;
    imageUrl: string | null;
    similarity: number;
  }[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=outfits&limit=20`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on initial load if query exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader isAdmin={false} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search</h1>

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for outfits..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8">
            {/* Outfits Results */}
            {results.outfits && results.outfits.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Results ({results.outfits.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.outfits.map((outfit) => (
                    <OutfitCard
                      key={outfit.slug}
                      outfit={{
                        ...outfit,
                        inspirationPhotoUrl: outfit.imageUrl,
                      }}
                      similarity={outfit.similarity}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {(!results.outfits || results.outfits.length === 0) && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-600">No results found for "{query}"</p>
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <SiteHeader isAdmin={false} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
