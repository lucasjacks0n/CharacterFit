import { NextResponse } from "next/server";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";

export async function POST(request: Request) {
  let driver;

  try {
    const { costumeWallUrl } = await request.json();

    if (!costumeWallUrl) {
      return NextResponse.json(
        { error: "CostumeWall URL is required" },
        { status: 400 }
      );
    }

    // Validate it's a costumewall.com URL
    if (!costumeWallUrl.includes("costumewall.com")) {
      return NextResponse.json(
        { error: "URL must be from costumewall.com" },
        { status: 400 }
      );
    }

    console.log(`Scraping CostumeWall page: ${costumeWallUrl}`);

    // Set the ChromeDriver path (same as Amazon scraper)
    const chromeDriverPath = path.join(
      process.cwd(),
      "node_modules",
      "chromedriver",
      "lib",
      "chromedriver",
      "chromedriver"
    );

    const service = new chrome.ServiceBuilder(chromeDriverPath);

    // Set up Chrome options with stealth settings
    const options = new chrome.Options();
    options.addArguments("--headless"); // Use headless mode
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--disable-gpu");
    options.addArguments("--disable-blink-features=AutomationControlled");
    options.addArguments("--window-size=1920,1080");
    options.addArguments(
      "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    // Disable logging to prevent disk space issues
    options.addArguments("--log-level=3");
    options.addArguments("--silent");
    options.addArguments("--disable-logging");
    options.addArguments("--disable-extensions");
    options.addArguments("--disable-background-networking");

    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeService(service)
      .setChromeOptions(options)
      .build();

    // Navigate to the CostumeWall page
    await driver.get(costumeWallUrl);

    // Wait for page to load
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    // Wait a bit for dynamic content
    await driver.sleep(2000);

    // Extract outfit name from h1
    let outfitName = "Untitled Outfit";
    try {
      const h1Element = await driver.findElement(By.css("h1"));
      const h1Text = await h1Element.getText();
      if (h1Text) {
        // Clean up the title by removing common prefixes
        outfitName = h1Text
          .trim()
          .replace(/^How to Dress Like\s+/i, "")
          .replace(/^Dress Like\s+/i, "")
          .replace(/^Get the Look:\s+/i, "")
          .replace(/\s+Costume$/i, "")
          .replace(/\s+Outfit$/i, "")
          .trim();
      }
    } catch (error) {
      console.error("Could not find h1 element, using default name");
    }

    // Find product links - use specific selectors for CostumeWall's structure
    // First try hotspotter links, then fall back to all content links
    let links = await driver.findElements(By.css("a.imagehotspotter_spot, a[data-character]"));

    // If no hotspotter links found, get all links in main content
    if (links.length === 0) {
      links = await driver.findElements(By.css("a"));
    }

    interface ProductInfo {
      url: string;
      label: string;
      isAmazon: boolean;
    }

    const products: ProductInfo[] = [];
    const seenUrls = new Set<string>();

    console.log(`Found ${links.length} total links to process`);

    for (const link of links) {
      try {
        const href = await link.getAttribute("href");
        if (!href) continue;

        // Skip internal CostumeWall links
        if (href.includes('costumewall.com')) continue;

        let productUrl: string | null = null;
        let isAmazon = false;

        // Check if it's a Geniuslink redirect (geni.us or buy.geni.us)
        if (href.includes("geni.us")) {
          // Try to extract the destination URL from GR_URL parameter
          const grUrlMatch = href.match(/[?&](?:GR_URL|amazon|url)=([^&]+)/i);
          if (grUrlMatch) {
            try {
              productUrl = decodeURIComponent(grUrlMatch[1]);
              isAmazon = productUrl.includes("amazon.com");
            } catch (e) {
              console.error("Error decoding redirect URL:", e);
            }
          }
        }
        // Check if it's a direct Amazon link
        else if (href.includes("amazon.com")) {
          productUrl = href;
          isAmazon = true;
        }
        // Capture all other external product links
        else if (href.startsWith("http")) {
          productUrl = href;
          isAmazon = false;
        }

        // Process the product URL
        if (productUrl) {
          let cleanUrl = productUrl;
          let productId = "";

          // For Amazon URLs, extract ASIN and normalize
          if (isAmazon && (productUrl.includes("amazon.com/dp/") || productUrl.includes("amazon.com/gp/product/"))) {
            const asinMatch = productUrl.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
            if (asinMatch) {
              const asin = asinMatch[2];
              cleanUrl = `https://www.amazon.com/dp/${asin}`;
              productId = asin;
            }
          } else {
            // For non-Amazon URLs, use as-is
            productId = cleanUrl;
          }

          // Only add if we haven't seen this URL yet
          if (!seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);

            // Extract product label - try title attribute first, then link text
            const titleAttr = await link.getAttribute("title");
            const linkText = await link.getText();
            const label = titleAttr?.trim() || linkText.trim() || `Product ${productId}`;

            products.push({
              url: cleanUrl,
              label,
              isAmazon,
            });
          }
        }
      } catch (err) {
        // Skip this link if there's an error
        console.error("Error processing link:", err);
      }
    }

    const amazonProducts = products.filter(p => p.isAmazon);
    const nonAmazonProducts = products.filter(p => !p.isAmazon);

    console.log(`Found ${products.length} total products: ${amazonProducts.length} Amazon, ${nonAmazonProducts.length} non-Amazon`);

    return NextResponse.json({
      outfitName,
      products,
      count: products.length,
      amazonCount: amazonProducts.length,
      nonAmazonCount: nonAmazonProducts.length,
    });

  } catch (error) {
    console.error("Error scraping CostumeWall:", error);

    return NextResponse.json(
      {
        error: "Failed to scrape CostumeWall page",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    // Always cleanup driver, even if there were errors
    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error("Error quitting driver:", quitError);
        // Force close if quit fails
        try {
          await driver.close();
        } catch (closeError) {
          console.error("Error closing driver:", closeError);
        }
      }
    }
  }
}
