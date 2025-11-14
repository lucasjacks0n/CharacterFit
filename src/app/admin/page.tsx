"use client";

import { useState } from "react";

export default function AdminPage() {
  const [isScraping, setIsScraping] = useState(false);
  const [message, setMessage] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");

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

      setMessage(`✅ Product saved successfully! "${result.item.title}"`);
      setAmazonUrl("");
    } catch (error) {
      setMessage("❌ Error: " + (error as Error).message);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Add Clothing Item from Amazon
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
