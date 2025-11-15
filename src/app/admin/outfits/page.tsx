"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  price: string | null;
  color: string | null;
  imageUrl: string | null;
  category: string | null;
}

interface SelectedItem extends ClothingItem {
  // Same as ClothingItem for now
}

export default function CreateOutfitPage() {
  const [outfitName, setOutfitName] = useState("");
  const [outfitDescription, setOutfitDescription] = useState("");
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [amazonUrl, setAmazonUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  // Search for existing clothing items
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/clothing-items/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const items = await response.json();
        setSearchResults(items);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add item to outfit
  const addItemToOutfit = (item: ClothingItem) => {
    if (!selectedItems.find((i) => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // Remove item from outfit
  const removeItemFromOutfit = (itemId: number) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
  };

  // Scrape and add from Amazon
  const handleScrapeAndAdd = async () => {
    if (!amazonUrl) {
      setMessage("Please enter an Amazon URL");
      return;
    }

    setIsScraping(true);
    setMessage("Scraping product...");

    try {
      const response = await fetch("/api/scrape-amazon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productUrl: amazonUrl,
          autoSave: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to scrape product");
      }

      const result = await response.json();

      // Add the newly scraped item to the outfit
      addItemToOutfit(result.item);
      setMessage(`✅ Added "${result.item.title}" to outfit`);
      setAmazonUrl("");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    } finally {
      setIsScraping(false);
    }
  };

  // Create outfit
  const handleCreateOutfit = async () => {
    if (!outfitName.trim()) {
      setMessage("Please enter an outfit name");
      return;
    }

    if (selectedItems.length === 0) {
      setMessage("Please add at least one item to the outfit");
      return;
    }

    setIsCreating(true);
    setMessage("Creating outfit...");

    try {
      const response = await fetch("/api/outfits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: outfitName,
          description: outfitDescription || null,
          occasion: occasion || null,
          season: season || null,
          itemIds: selectedItems.map((item) => item.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to create outfit");
      }

      const result = await response.json();
      setMessage(`✅ Outfit "${result.outfit.name}" created successfully!`);

      // Reset form
      setOutfitName("");
      setOutfitDescription("");
      setOccasion("");
      setSeason("");
      setSelectedItems([]);
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
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

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Create New Outfit
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Outfit Details & Item Selection */}
          <div className="space-y-6">
            {/* Outfit Details */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Outfit Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="outfitName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="outfitName"
                    placeholder="Summer Beach Look"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Casual beach outfit for warm weather..."
                    value={outfitDescription}
                    onChange={(e) => setOutfitDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="occasion" className="block text-sm font-medium text-gray-700 mb-1">
                      Occasion
                    </label>
                    <input
                      type="text"
                      id="occasion"
                      placeholder="casual, formal, work..."
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-1">
                      Season
                    </label>
                    <input
                      type="text"
                      id="season"
                      placeholder="spring, summer, fall, winter"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Existing Items */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add Items
              </h2>

              <div className="space-y-4">
                {/* Search existing */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Existing Items
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by title, brand, color..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                  />

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => addItemToOutfit(item)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.brand} {item.color && `• ${item.color}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Or add from Amazon */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="amazonUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Add from Amazon URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      id="amazonUrl"
                      placeholder="https://www.amazon.com/..."
                      value={amazonUrl}
                      onChange={(e) => setAmazonUrl(e.target.value)}
                      disabled={isScraping}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleScrapeAndAdd}
                      disabled={isScraping}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isScraping ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Selected Items & Create Button */}
          <div className="space-y-6">
            {/* Selected Items */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Selected Items ({selectedItems.length})
              </h2>

              {selectedItems.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No items added yet. Search for items or add from Amazon.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.brand} {item.color && `• ${item.color}`}
                          {item.category && ` • ${item.category}`}
                        </p>
                        {item.price && (
                          <p className="text-xs text-gray-600 font-medium mt-1">
                            ${item.price}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItemFromOutfit(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateOutfit}
              disabled={isCreating || !outfitName.trim() || selectedItems.length === 0}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? "Creating Outfit..." : "Create Outfit"}
            </button>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.includes("❌")
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : message.includes("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
