"use client";

import { useState } from "react";
import Link from "next/link";

interface ScrapedItem {
  id: number;
  title: string;
  brand: string | null;
  price: string | null;
  color: string | null;
  imageUrl: string | null;
  description: string | null;
}

export default function ProductImporterPage() {
  const [isScraping, setIsScraping] = useState(false);
  const [message, setMessage] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [scrapedItem, setScrapedItem] = useState<ScrapedItem | null>(null);

  const handleScrapeAndSave = async () => {
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
        throw new Error(error.details || "Failed to scrape and save product");
      }

      const result = await response.json();

      setMessage(`✅ Product saved successfully!`);
      setScrapedItem(result.item);
      setAmazonUrl("");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
      setScrapedItem(null);
    } finally {
      setIsScraping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isScraping) {
      handleScrapeAndSave();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
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

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Product Importer
        </h1>

        {/* Simple Scraper Interface */}
        <div className="bg-white shadow-sm rounded-lg p-8 space-y-6">
          <div>
            <label
              htmlFor="amazonUrl"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Amazon Product URL
            </label>
            <input
              type="url"
              id="amazonUrl"
              placeholder="https://www.amazon.com/..."
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isScraping}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={handleScrapeAndSave}
            disabled={isScraping}
            className="w-full px-6 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isScraping ? "Scraping & Saving..." : "Scrape & Save to Database"}
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

        {/* Scraped Item Display */}
        {scrapedItem && (
          <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Scraped Product
            </h2>
            <div className="space-y-4">
              {/* Image */}
              {scrapedItem.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={scrapedItem.imageUrl}
                    alt={scrapedItem.title}
                    className="max-w-xs h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900 mt-1">{scrapedItem.title}</p>
              </div>

              {/* Brand */}
              {scrapedItem.brand && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Brand</label>
                  <p className="text-gray-900 mt-1">{scrapedItem.brand}</p>
                </div>
              )}

              {/* Price */}
              {scrapedItem.price && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Price</label>
                  <p className="text-gray-900 mt-1">${scrapedItem.price}</p>
                </div>
              )}

              {/* Color */}
              {scrapedItem.color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Color</label>
                  <p className="text-gray-900 mt-1">{scrapedItem.color}</p>
                </div>
              )}

              {/* Description */}
              {scrapedItem.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap text-sm">
                    {scrapedItem.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            How it works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Paste an Amazon product URL</li>
            <li>Click "Scrape & Save" or press Enter</li>
            <li>
              The product will be automatically scraped and saved to your
              database
            </li>
          </ol>
          <p className="mt-4 text-sm text-blue-700">
            The scraper extracts: title, brand, color, description, image, and price
            (when available)
          </p>
        </div>
      </div>
    </div>
  );
}
