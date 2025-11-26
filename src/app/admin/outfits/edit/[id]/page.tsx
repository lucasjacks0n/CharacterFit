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
  productUrl: string | null;
}

interface SelectedItem extends ClothingItem {}

export default function EditOutfitPage() {
  const params = useParams();
  const router = useRouter();
  const outfitId = params.id as string;

  const [outfitName, setOutfitName] = useState("");
  const [outfitSlug, setOutfitSlug] = useState("");
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [status, setStatus] = useState(0);
  const [inspirationPhoto, setInspirationPhoto] = useState<File | null>(null);
  const [inspirationPhotoUrl, setInspirationPhotoUrl] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [fromBulkUrl, setFromBulkUrl] = useState<string | null>(null);

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

  // AI Description Generator state
  const [wikipediaUrl, setWikipediaUrl] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Outfit Sections state
  interface OutfitSection {
    id: number;
    sectionType: string;
    heading: string | null;
    content: string;
    metaJson: string | null;
  }
  const [outfitSections, setOutfitSections] = useState<OutfitSection[]>([]);

  // Missing products state
  interface MissingProduct {
    id: number;
    productName: string;
    originalAmazonUrl: string;
    replacementUrl: string | null;
    status: string;
  }
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [replacementUrls, setReplacementUrls] = useState<Record<number, string>>({});

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
        setOutfitSlug(data.slug || "");
        setOccasion(data.occasion || "");
        setSeason(data.season || "");
        setStatus(data.status ?? 0);
        setSelectedItems(data.items || []);
        setCollageUrl(data.imageUrl || null);
        setInspirationPhotoUrl(data.inspirationPhotoUrl || "");
        setFromBulkUrl(data.fromBulkUrl || null);
      } else {
        setMessage("❌ Failed to load outfit");
      }

      // Fetch missing products
      const missingResponse = await fetch(`/api/missing-products?outfitId=${outfitId}`);
      if (missingResponse.ok) {
        const missingData = await missingResponse.json();
        setMissingProducts(missingData.products || []);
      }

      // Fetch outfit sections
      const sectionsResponse = await fetch(`/api/outfits/${outfitId}/sections`);
      if (sectionsResponse.ok) {
        const sectionsData = await sectionsResponse.json();
        setOutfitSections(sectionsData.sections || []);
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
  }, [outfitName, occasion, season, status, selectedItems]);

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
          occasion: occasion || null,
          season: season || null,
          status: status,
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
          occasion: occasion || null,
          season: season || null,
          status: status,
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

  // Resolve missing product with replacement URL
  const handleResolveMissingProduct = async (missingProductId: number) => {
    const replacementUrl = replacementUrls[missingProductId];
    if (!replacementUrl) {
      setMessage("Please enter a replacement Amazon URL");
      return;
    }

    setMessage("Resolving missing product...");

    try {
      const response = await fetch(`/api/missing-products/${missingProductId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ replacementUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to resolve missing product");
      }

      const result = await response.json();

      // Add the resolved item to the outfit
      addItemToOutfit(result.item);

      // Refresh missing products list
      await fetchOutfit();

      setMessage(`✅ Product resolved and added to outfit!`);

      // Clear the replacement URL input
      setReplacementUrls((prev) => {
        const updated = { ...prev };
        delete updated[missingProductId];
        return updated;
      });
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    }
  };

  // Delete missing product
  const handleDeleteMissingProduct = async (missingProductId: number) => {
    if (!confirm("Are you sure you want to remove this missing product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/missing-products/${missingProductId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete missing product");
      }

      // Refresh missing products list
      await fetchOutfit();
      setMessage("✅ Missing product removed");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
    }
  };

  // Generate AI description with optional Wikipedia context
  const handleGenerateDescription = async () => {
    if (!outfitName.trim()) {
      setMessage("❌ Please enter an outfit name first");
      return;
    }

    setIsGeneratingDescription(true);
    setMessage("🤖 Generating AI description...");

    try {
      const response = await fetch("/api/admin/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outfitId: outfitId,
          outfitName: outfitName.trim(),
          wikipediaUrl: wikipediaUrl.trim() || undefined,
          occasion: occasion.trim() || undefined,
          season: season.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Failed to generate description");
      }

      const data = await response.json();

      // Refresh outfit sections after generation
      await fetchOutfit();

      setMessage("✅ Content sections generated and saved successfully");
    } catch (error) {
      setMessage("❌ Failed to generate description: " + (error as Error).message);
    } finally {
      setIsGeneratingDescription(false);
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
      {/* Message Toast - Fixed at top */}
      {message && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div
            className={`p-4 rounded-md shadow-lg ${
              message.includes("❌")
                ? "bg-red-50 text-red-800 border border-red-200"
                : message.includes("✅")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {message}
          </div>
        </div>
      )}

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

          {outfitSlug && (
            <Link
              href={`/outfits/${outfitSlug}`}
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
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Outfit</h1>
          {fromBulkUrl && (
            <a
              href={fromBulkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 mt-2 text-sm"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Imported from CostumeWall
            </a>
          )}
        </div>

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

                {/* AI Description Generator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">
                    🤖 AI Description Generator
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="wikipediaUrl"
                        className="block text-xs font-medium text-gray-700 mb-1"
                      >
                        Wikipedia URL (optional)
                      </label>
                      <input
                        type="text"
                        id="wikipediaUrl"
                        placeholder="e.g., https://en.wikipedia.org/wiki/Batman"
                        value={wikipediaUrl}
                        onChange={(e) => setWikipediaUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Add a Wikipedia URL for factual character context
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription || !outfitName.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isGeneratingDescription ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        "Generate Content Sections with AI"
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Content Sections Display */}
                {outfitSections.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-900 mb-3">
                      ✅ Generated Content Sections
                    </h3>
                    <div className="space-y-4">
                      {outfitSections.map((section) => (
                        <div key={section.id} className="bg-white rounded p-3 border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              {section.sectionType.replace(/_/g, ' ')}
                            </span>
                            {section.heading && (
                              <span className="text-xs text-gray-500">{section.heading}</span>
                            )}
                          </div>
                          {section.sectionType === 'fast_facts' && section.metaJson ? (
                            <div className="space-y-1">
                              {JSON.parse(section.metaJson).map((fact: {label: string; value: string}, idx: number) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium text-gray-700">{fact.label}:</span>{' '}
                                  <span className="text-gray-600">{fact.value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{section.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  >
                    <option value={0}>Pending / Draft</option>
                    <option value={1}>Approved</option>
                    <option value={2}>Rejected</option>
                  </select>
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

            {/* Missing Products Section */}
            {missingProducts.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-yellow-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Missing Products ({missingProducts.filter((p) => p.status === "pending").length})
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  These products were unavailable during bulk import. Provide replacement Amazon URLs to add them to your outfit.
                </p>

                <div className="space-y-4">
                  {missingProducts
                    .filter((product) => product.status === "pending")
                    .map((product) => (
                      <div
                        key={product.id}
                        className="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {product.productName}
                            </p>
                            <a
                              href={product.originalAmazonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-gray-700 underline mt-1 inline-block"
                            >
                              Original Amazon link
                            </a>
                          </div>
                          <button
                            onClick={() => handleDeleteMissingProduct(product.id)}
                            className="text-red-600 hover:text-red-800 text-xs ml-2"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="flex space-x-2">
                          <input
                            type="url"
                            placeholder="https://www.amazon.com/... (replacement URL)"
                            value={replacementUrls[product.id] || ""}
                            onChange={(e) =>
                              setReplacementUrls((prev) => ({
                                ...prev,
                                [product.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm text-gray-900"
                          />
                          <button
                            onClick={() => handleResolveMissingProduct(product.id)}
                            disabled={!replacementUrls[product.id]}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                          >
                            Add to Outfit
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
                        {item.productUrl ? (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                        )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
