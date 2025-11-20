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
  productUrl: string | null;
}

interface SelectedItem extends ClothingItem {
  // Same as ClothingItem for now
}

export default function CreateOutfitPage() {
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
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  // CostumeWall bulk import
  const [costumeWallUrl, setCostumeWallUrl] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState("");
  const [skippedProducts, setSkippedProducts] = useState<{ url: string; label: string }[]>([]);

  // Set page title
  useEffect(() => {
    document.title = "Create Outfit - CharacterFits";
  }, []);

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

  // Add item to outfit
  const addItemToOutfit = (item: ClothingItem) => {
    setSelectedItems((prevItems) => {
      // Check if item already exists
      if (prevItems.find((i) => i.id === item.id)) {
        return prevItems;
      }
      return [...prevItems, item];
    });
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

  // Bulk import from CostumeWall
  const handleBulkImportFromCostumeWall = async () => {
    if (!costumeWallUrl) {
      setMessage("Please enter a CostumeWall URL");
      return;
    }

    setIsBulkImporting(true);
    setBulkImportProgress("Checking for duplicates...");
    setMessage("");
    setSkippedProducts([]);

    try {
      // Step 0: Check if this URL has already been imported
      const checkResponse = await fetch(`/api/outfits/check-bulk-url?url=${encodeURIComponent(costumeWallUrl)}`);

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          setMessage(`⚠️ This CostumeWall URL has already been imported as "${checkData.outfitName}"`);
          setIsBulkImporting(false);
          setBulkImportProgress("");
          return;
        }
      }

      // Step 1: Scrape CostumeWall page to get all Amazon URLs
      setBulkImportProgress("Finding Amazon products...");
      const cwResponse = await fetch("/api/scrape-costumewall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          costumeWallUrl: costumeWallUrl,
        }),
      });

      if (!cwResponse.ok) {
        const error = await cwResponse.json();
        throw new Error(error.details || "Failed to scrape CostumeWall page");
      }

      const { outfitName: scrapedOutfitName, products, amazonCount, nonAmazonCount } = await cwResponse.json();

      if (products.length === 0) {
        setMessage("⚠️ No products found on this CostumeWall page");
        setIsBulkImporting(false);
        setBulkImportProgress("");
        return;
      }

      // Separate Amazon and non-Amazon products
      const amazonProducts = products.filter((p: any) => p.isAmazon);
      const nonAmazonProducts = products.filter((p: any) => !p.isAmazon);

      if (amazonProducts.length === 0) {
        setMessage("⚠️ No Amazon products found on this CostumeWall page (all products are from other retailers)");
        setIsBulkImporting(false);
        setBulkImportProgress("");
        return;
      }

      setBulkImportProgress(
        `Found ${amazonCount} Amazon product${amazonCount !== 1 ? 's' : ''} and ${nonAmazonCount} non-Amazon product${nonAmazonCount !== 1 ? 's' : ''}. Scraping Amazon products...`
      );

      // Step 2: Batch scrape all Amazon products with single Chrome instance
      const batchResponse = await fetch("/api/scrape-amazon/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productUrls: amazonProducts.map((p: any) => p.url),
        }),
      });

      if (!batchResponse.ok) {
        const error = await batchResponse.json();
        throw new Error(error.details || "Failed to batch scrape products");
      }

      const batchResult = await batchResponse.json();
      const { results } = batchResult;

      // Process results and build list of successful items
      let successCount = 0;
      const skippedList: { url: string; label: string }[] = [];
      const successfulItems: ClothingItem[] = [];

      // Add all non-Amazon products to skipped list immediately
      nonAmazonProducts.forEach((p: any) => {
        console.log(`Skipping non-Amazon product: ${p.label} (${p.url})`);
        skippedList.push({
          url: p.url,
          label: p.label,
        });
      });

      // Process Amazon scrape results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.success && result.item) {
          addItemToOutfit(result.item);
          successfulItems.push(result.item);
          successCount++;
        } else {
          // Amazon product failed to scrape or was unavailable
          const productInfo = amazonProducts[i];
          console.log(`Skipping Amazon product ${productInfo.label} (${result.url}): ${result.error || "Unknown error"}`);
          skippedList.push({
            url: result.url,
            label: productInfo.label,
          });
        }
      }

      console.log(
        `Bulk import complete: ${successCount} added, ${skippedList.length} skipped`
      );
      console.log("Skipped URLs:", skippedList);

      setSkippedProducts(skippedList);
      setCostumeWallUrl("");

      // Create outfit even if no products were successfully scraped
      // This logs the fromBulkUrl and prevents future retries
      setBulkImportProgress("Creating outfit...");

      // Create the outfit automatically using the successful items we just collected
      const createResponse = await fetch("/api/outfits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: scrapedOutfitName,
          description: null,
          occasion: null,
          season: null,
          itemIds: successfulItems.map((item) => item.id),
          inspirationPhotoUrl: null,
          fromBulkUrl: costumeWallUrl,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.details || "Failed to create outfit");
      }

      const createResult = await createResponse.json();
      const outfitId = createResult.outfit.id;

      // Save missing products to database if any
      if (skippedList.length > 0) {
        setBulkImportProgress("Saving missing products...");

        await fetch("/api/missing-products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outfitId,
            products: skippedList.map((p) => ({
              productName: p.label,
              originalAmazonUrl: p.url,
            })),
          }),
        });
      }

      setBulkImportProgress("");

      // Redirect to edit page
      window.location.href = `/admin/outfits/edit/${outfitId}`;

    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
      setBulkImportProgress("");
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Handle inspiration photo upload
  const handleInspirationPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInspirationPhoto(file);
    setIsUploadingPhoto(true);
    setMessage("Uploading inspiration photo...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/inspiration-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      const result = await response.json();
      setInspirationPhotoUrl(result.url);
      setMessage("✅ Inspiration photo uploaded!");
    } catch (error) {
      setMessage("❌ Failed to upload photo: " + (error as Error).message);
      setInspirationPhoto(null);
    } finally {
      setIsUploadingPhoto(false);
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
          inspirationPhotoUrl: inspirationPhotoUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to create outfit");
      }

      const result = await response.json();
      const outfitId = result.outfit.id;

      // Only generate collage in development
      if (process.env.NODE_ENV !== "production") {
        setMessage(`✅ Outfit created! Generating collage...`);

        // Automatically generate collage
        try {
          await fetch(`/api/outfits/${outfitId}/generate-collage`, {
            method: "POST",
          });
          setMessage(`✅ Outfit "${result.outfit.name}" created with collage!`);
        } catch (collageError) {
          console.error("Failed to generate collage:", collageError);
          setMessage(
            `✅ Outfit created, but collage generation failed. You can generate it manually from the edit page.`
          );
        }
      } else {
        setMessage(`✅ Outfit "${result.outfit.name}" created successfully!`);
      }

      // Reset form
      setOutfitName("");
      setOutfitDescription("");
      setOccasion("");
      setSeason("");
      setSelectedItems([]);
      setInspirationPhoto(null);
      setInspirationPhotoUrl("");
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                </div>

                {/* Inspiration Photo Upload */}
                <div>
                  <label
                    htmlFor="inspirationPhoto"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Inspiration Photo
                  </label>
                  <input
                    type="file"
                    id="inspirationPhoto"
                    accept="image/*"
                    onChange={handleInspirationPhotoChange}
                    disabled={isUploadingPhoto}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
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

            {/* Search Existing Items */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add Items
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

                {/* Or add from CostumeWall */}
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
                    htmlFor="costumeWallUrl"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Bulk Import from CostumeWall
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      id="costumeWallUrl"
                      placeholder="https://costumewall.com/dress-like-..."
                      value={costumeWallUrl}
                      onChange={(e) => setCostumeWallUrl(e.target.value)}
                      disabled={isBulkImporting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleBulkImportFromCostumeWall}
                      disabled={isBulkImporting}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isBulkImporting ? "Importing..." : "Import All"}
                    </button>
                  </div>
                  {bulkImportProgress && (
                    <p className="text-sm text-purple-600 mt-2">
                      {bulkImportProgress}
                    </p>
                  )}
                  {skippedProducts.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm font-medium text-yellow-800 mb-2">
                        ⚠️ Skipped {skippedProducts.length} unavailable product
                        {skippedProducts.length > 1 ? "s" : ""}:
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {skippedProducts.map((product, index) => (
                          <a
                            key={index}
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-yellow-700 hover:text-yellow-900 underline block"
                          >
                            {product.label}
                          </a>
                        ))}
                      </div>
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
                    Add Single Amazon Product
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
                        {item.productUrl ? (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-orange-600 truncate block"
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

            {/* Create Button */}
            <button
              onClick={handleCreateOutfit}
              disabled={
                isCreating || !outfitName.trim() || selectedItems.length === 0
              }
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
