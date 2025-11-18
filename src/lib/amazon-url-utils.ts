/**
 * Normalizes an Amazon product URL to prevent duplicates
 * Keeps only the essential parts: domain and product ID (ASIN)
 *
 * Examples:
 * - https://www.amazon.com/Product-Name/dp/B07J4Q7LFQ/ref=something?tag=xyz
 * - https://amazon.com/dp/B07J4Q7LFQ?ref=xyz
 * Both normalize to: https://www.amazon.com/dp/B07J4Q7LFQ
 */
export function normalizeAmazonUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Ensure it's an Amazon domain
    if (!urlObj.hostname.includes('amazon.com')) {
      return url; // Return as-is if not Amazon
    }

    // Extract the ASIN (Amazon Standard Identification Number)
    // ASIN is always 10 characters and appears after /dp/ or /gp/product/
    const asinMatch = urlObj.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);

    if (!asinMatch || !asinMatch[2]) {
      return url; // Return as-is if we can't extract ASIN
    }

    const asin = asinMatch[2];

    // Return normalized URL: https://www.amazon.com/dp/{ASIN}
    return `https://www.amazon.com/dp/${asin}`;
  } catch (error) {
    console.error('Failed to normalize Amazon URL:', error);
    return url; // Return as-is if parsing fails
  }
}

/**
 * Checks if a URL is an Amazon product URL
 */
export function isAmazonUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('amazon.com');
  } catch {
    return false;
  }
}
