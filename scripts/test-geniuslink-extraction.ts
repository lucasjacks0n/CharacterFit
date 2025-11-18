// Test extracting Amazon URLs from Geniuslink redirects

const testUrls = [
  "http://buy.geni.us/Proxy.ashx?TSID=20413&GR_URL=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB09YYVHWSL%2F%3Ftag%3Dcwall-20&dtb=1",
  "https://geni.us/abc123?amazon=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB01N7Y7OP0",
  "https://www.amazon.com/dp/B07J4Q7LFQ/ref=sr_1_1?tag=test-20",
];

console.log("Testing Geniuslink extraction...\n");

for (const url of testUrls) {
  console.log(`\nInput: ${url}`);

  let amazonUrl: string | null = null;

  // Check if it's a Geniuslink redirect (geni.us or buy.geni.us) - check this FIRST
  if (url.includes("geni.us")) {
    // Extract the Amazon URL from the GR_URL parameter (or similar param)
    const grUrlMatch = url.match(/[?&](?:GR_URL|amazon)=([^&]+)/i);
    console.log(`  Match result:`, grUrlMatch);
    if (grUrlMatch) {
      try {
        const encoded = grUrlMatch[1];
        console.log(`  Encoded URL: ${encoded}`);
        amazonUrl = decodeURIComponent(encoded);
        console.log(`  Decoded redirect URL: ${amazonUrl}`);
      } catch (e) {
        console.error("Error decoding redirect URL:", e);
      }
    } else {
      console.log("  No GR_URL or amazon parameter found");
    }
  }
  // Check if it's a direct Amazon link
  else if (url.includes("amazon.com")) {
    amazonUrl = url;
  }

  // If we found an Amazon URL (direct or from redirect), extract the ASIN
  if (amazonUrl && (amazonUrl.includes("amazon.com/dp/") || amazonUrl.includes("amazon.com/gp/product/"))) {
    const asinMatch = amazonUrl.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      const asin = asinMatch[2];
      const cleanUrl = `https://www.amazon.com/dp/${asin}`;
      console.log(`✅ Extracted ASIN: ${asin}`);
      console.log(`✅ Clean URL: ${cleanUrl}`);
    }
  } else {
    console.log("❌ Could not extract Amazon URL");
  }
}

console.log("\n✅ Test complete!");
