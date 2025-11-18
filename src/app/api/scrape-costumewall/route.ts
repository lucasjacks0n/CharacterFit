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

    // Find all links - including Geniuslink redirects
    const links = await driver.findElements(By.css("a"));

    interface ProductInfo {
      url: string;
      label: string;
    }

    const products: ProductInfo[] = [];
    const seenUrls = new Set<string>();

    console.log(`Found ${links.length} total links to process`);

    for (const link of links) {
      try {
        const href = await link.getAttribute("href");
        if (!href) continue;

        let amazonUrl: string | null = null;

        // Check if it's a Geniuslink redirect (geni.us or buy.geni.us) - check this FIRST
        if (href.includes("geni.us")) {
          // Extract the Amazon URL from the GR_URL parameter (or similar param)
          const grUrlMatch = href.match(/[?&](?:GR_URL|amazon)=([^&]+)/i);
          if (grUrlMatch) {
            try {
              amazonUrl = decodeURIComponent(grUrlMatch[1]);
            } catch (e) {
              console.error("Error decoding redirect URL:", e);
            }
          }
        }
        // Check if it's a direct Amazon link
        else if (href.includes("amazon.com")) {
          amazonUrl = href;
        }

        // If we found an Amazon URL (direct or from redirect), extract the ASIN
        if (amazonUrl && (amazonUrl.includes("amazon.com/dp/") || amazonUrl.includes("amazon.com/gp/product/"))) {
          const asinMatch = amazonUrl.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (asinMatch) {
            const asin = asinMatch[2];
            const cleanUrl = `https://www.amazon.com/dp/${asin}`;

            // Only add if we haven't seen this ASIN yet
            if (!seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);

              // Extract product label - try title attribute first, then link text
              const titleAttr = await link.getAttribute("title");
              const linkText = await link.getText();
              const label = titleAttr?.trim() || linkText.trim() || `Product ${asin}`;

              products.push({
                url: cleanUrl,
                label,
              });
            }
          }
        }
      } catch (err) {
        // Skip this link if there's an error
        console.error("Error processing link:", err);
      }
    }

    await driver.quit();
    driver = null;

    console.log(`Found ${products.length} unique Amazon products with labels`);

    return NextResponse.json({
      products,
      count: products.length,
    });

  } catch (error) {
    console.error("Error scraping CostumeWall:", error);

    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error("Error quitting driver:", quitError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to scrape CostumeWall page",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
