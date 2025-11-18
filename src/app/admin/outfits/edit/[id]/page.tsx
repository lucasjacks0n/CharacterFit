"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface ClothingItem {
  id: number;
  title: string;
  brand: string | null;
  price: string | null;
  color: string | null;
  imageUrl: string | null;
  category: string | null;
}

interface SelectedItem extends ClothingItem {}

export default function EditOutfitPage() {
  const params = useParams();
  const router = useRouter();
  const outfitId = params.id as string;

  const [outfitName, setOutfitName] = useState("");
  const [outfitDescription, setOutfitDescription] = useState("");
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [inspirationPhoto, setInspirationPhoto] = useState<File | null>(null);
  const [inspirationPhotoUrl, setInspirationPhotoUrl] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [amazonUrl, setAmazonUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [isDeletingCollage, setIsDeletingCollage] = useState(false);
  const [message, setMessage] = useState("");
  const [collageUrl, setCollageUrl] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Edit Outfit - CharacterFits";
  }, []);

  // Load outfit data
  useEffect(() => {
    fetchOutfit();
  }, [outfitId]);

  const fetchOutfit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/outfits/${outfitId}`);
      if (response.ok) {
        const data = await response.json();
        setOutfitName(data.name);
        setOutfitDescription(data.description || "");
        setOccasion(data.occasion || "");
        setSeason(data.season || "");
        setSelectedItems(data.items || []);
        setCollageUrl(data.imageUrl || null);
        setInspirationPhotoUrl(data.inspirationPhotoUrl || "");
      } else {
        setMessage("❌ Failed to load outfit");
      }
    } catch (error) {
      console.error("Failed to fetch outfit:", error);
      setMessage("❌ Failed to load outfit");
    } finally {
      setIsLoading(false);
    }
  };

  // Search for existing clothing items
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/clothing-items/search?q=${encodeURIComponent(searchQuery)}`
      );
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

  // Auto-save when fields change
  useEffect(() => {
    // Don't auto-save on initial load
    if (isLoading) return;

    // Don't auto-save if name is empty
    if (!outfitName.trim()) return;

    const timer = setTimeout(() => {
      autoSave();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [outfitName, outfitDescription, occasion, season, selectedItems]);

  const autoSave = async () => {
    if (!outfitName.trim() || selectedItems.length === 0) return;

    try {
      await fetch(`/api/outfits/${outfitId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: outfitName,
          description: outfitDescription || null,
          occasion: occasion || null,
          season: season || null,
          itemIds: selectedItems.map((item) => item.id),
          inspirationPhotoUrl: inspirationPhotoUrl || null,
        }),
      });

      setMessage("✅ Auto-saved");
      // Clear message after 2 seconds
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

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

        // Handle duplicate product (409 Conflict) - just add the existing product
        if (response.status === 409 && error.existingItem) {
          addItemToOutfit(error.existingItem);
          setMessage(`✅ Added "${error.existingItem.title}" to outfit`);
          setAmazonUrl("");
          setIsScraping(false);
          return;
        }

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

  // Handle inspiration photo upload
  const handleInspirationPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInspirationPhoto(file);
    setIsUploadingPhoto(true);
    setMessage("Uploading inspiration photo...");

    try {
      // Upload to Google Cloud Storage
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload/inspiration-photo", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photo");
      }

      const uploadResult = await uploadResponse.json();
      const photoUrl = uploadResult.url;

      // Immediately save to database
      const saveResponse = await fetch(`/api/outfits/${outfitId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: outfitName,
          description: outfitDescription || null,
          occasion: occasion || null,
          season: season || null,
          itemIds: selectedItems.map((item) => item.id),
          inspirationPhotoUrl: photoUrl,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save inspiration photo");
      }

      setInspirationPhotoUrl(photoUrl);
      setMessage("✅ Inspiration photo uploaded and saved!");
    } catch (error) {
      setMessage("❌ Failed to upload photo: " + (error as Error).message);
      setInspirationPhoto(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Generate collage
  const handleGenerateCollage = async () => {
    setIsGeneratingCollage(true);
    setMessage("Generating collage...");

    try {
      const response = await fetch(
        `/api/outfits/${outfitId}/generate-collage`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to generate collage");
      }

      const result = await response.json();
      setCollageUrl(result.collageUrl);
      setMessage("✅ Collage generated successfully!");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    } finally {
      setIsGeneratingCollage(false);
    }
  };

  // Delete collage
  const handleDeleteCollage = async () => {
    if (!confirm("Are you sure you want to delete this collage?")) {
      return;
    }

    setIsDeletingCollage(true);
    setMessage("Deleting collage...");

    try {
      const response = await fetch(
        `/api/outfits/${outfitId}/generate-collage`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to delete collage");
      }

      setCollageUrl(null);
      setMessage("✅ Collage deleted successfully!");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    } finally {
      setIsDeletingCollage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Loading outfit...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back to List */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/admin/outfits/list"
            className="inline-flex items-center text-green-600 hover:text-green-700"
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
            Back to Outfits List
          </Link>

          <Link
            href={`/outfits/${outfitId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View Outfit
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Outfit</h1>

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
                  <label
                    htmlFor="outfitName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    id="outfitName"
                    placeholder="Summer Beach Look"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Casual beach outfit for warm weather..."
                    value={outfitDescription}
                    onChange={(e) => setOutfitDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="occasion"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Occasion
                    </label>
                    <input
                      type="text"
                      id="occasion"
                      placeholder="casual, formal, work..."
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="season"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Season
                    </label>
                    <input
                      type="text"
                      id="season"
                      placeholder="spring, summer, fall, winter"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    />
                  </div>
                </div>

                {/* Inspiration Photo Upload */}
                <div>
                  <label htmlFor="inspirationPhoto" className="block text-sm font-medium text-gray-700 mb-1">
                    Inspiration Photo
                  </label>
                  <input
                    type="file"
                    id="inspirationPhoto"
                    accept="image/*"
                    onChange={handleInspirationPhotoChange}
                    disabled={isUploadingPhoto}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                  {isUploadingPhoto && (
                    <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                  )}
                  {inspirationPhotoUrl && (
                    <div className="mt-2">
                      <img
                        src={inspirationPhotoUrl}
                        alt="Inspiration"
                        className="w-32 h-32 object-cover rounded border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Items */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add More Items
              </h2>

              <div className="space-y-4">
                {/* Search existing */}
                <div>
                  <label
                    htmlFor="search"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Search Existing Items
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by title, brand, color..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
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
                  <label
                    htmlFor="amazonUrl"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
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

          {/* Right Column - Collage Preview & Selected Items */}
          <div className="space-y-6">
            {/* Collage Preview */}
            {collageUrl && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Outfit Collage
                </h3>
                <img
                  src={collageUrl}
                  alt="Outfit collage"
                  className="w-full h-auto rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* Selected Items */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Selected Items ({selectedItems.length})
              </h2>

              {selectedItems.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No items in outfit. Add some items to continue.
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

            {/* Collage Management - Only in development */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="space-y-2">
                <button
                  onClick={handleGenerateCollage}
                  disabled={isGeneratingCollage || isDeletingCollage || selectedItems.length === 0}
                  className="w-full px-6 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingCollage
                    ? "Generating Collage..."
                    : "Generate Collage"}
                </button>

                {collageUrl && (
                  <button
                    onClick={handleDeleteCollage}
                    disabled={isGeneratingCollage || isDeletingCollage}
                    className="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeletingCollage ? "Deleting..." : "Delete Collage"}
                  </button>
                )}
              </div>
            )}

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
