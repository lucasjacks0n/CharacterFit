// Test script to verify CostumeWall product name extraction
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";

async function testCostumeWallProductNames() {
  const testUrl = "https://costumewall.com/dress-like-squid-game-guard/";
  let driver;

  try {
    console.log(`Testing product name extraction from: ${testUrl}\n`);

    // Set up Chrome options
    const chromeDriverPath = path.join(
      process.cwd(),
      "node_modules",
      "chromedriver",
      "lib",
      "chromedriver",
      "chromedriver"
    );

    const service = new chrome.ServiceBuilder(chromeDriverPath);

    const options = new chrome.Options();
    options.addArguments("--headless");
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

    // Navigate to the page
    await driver.get(testUrl);
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    await driver.sleep(2000);

    console.log("Page loaded, finding links...\n");

    // Find all links
    const links = await driver.findElements(By.css("a"));
    console.log(`Found ${links.length} total links\n`);

    interface ProductInfo {
      url: string;
      label: string;
      href: string;
    }

    const products: ProductInfo[] = [];
    const seenUrls = new Set<string>();

    for (const link of links) {
      try {
        const href = await link.getAttribute("href");
        if (!href) continue;

        let amazonUrl: string | null = null;

        // Check if it's a Geniuslink redirect
        if (href.includes("geni.us")) {
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

        // If we found an Amazon URL, extract the ASIN
        if (amazonUrl && (amazonUrl.includes("amazon.com/dp/") || amazonUrl.includes("amazon.com/gp/product/"))) {
          const asinMatch = amazonUrl.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (asinMatch) {
            const asin = asinMatch[2];
            const cleanUrl = `https://www.amazon.com/dp/${asin}`;

            if (!seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);

              // Extract product label - try title attribute first, then link text
              const titleAttr = await link.getAttribute("title");
              const linkText = await link.getText();
              const label = titleAttr?.trim() || linkText.trim() || `Product ${asin}`;

              products.push({
                url: cleanUrl,
                label,
                href: href.substring(0, 100) + (href.length > 100 ? "..." : ""),
              });
            }
          }
        }
      } catch (err) {
        // Skip this link if there's an error
      }
    }

    await driver.quit();

    console.log("=" .repeat(80));
    console.log(`FOUND ${products.length} AMAZON PRODUCTS:`);
    console.log("=".repeat(80) + "\n");

    products.forEach((product, index) => {
      console.log(`${index + 1}. Label: "${product.label}"`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Original href: ${product.href}`);

      if (product.label.startsWith("Product B")) {
        console.log(`   ⚠️  WARNING: No text extracted - using fallback`);
      }
      console.log();
    });

    // Summary
    const emptyLabels = products.filter(p => p.label.startsWith("Product B")).length;
    console.log("=".repeat(80));
    console.log("SUMMARY:");
    console.log(`Total products: ${products.length}`);
    console.log(`Products with names: ${products.length - emptyLabels}`);
    console.log(`Products without names (using fallback): ${emptyLabels}`);
    console.log("=".repeat(80));

    if (emptyLabels > 0) {
      console.log("\n⚠️  Some products don't have visible text in their links.");
      console.log("This could be because:");
      console.log("- Links are images/buttons without text");
      console.log("- Text is in a parent or sibling element");
      console.log("- Text is loaded dynamically after the link");
    }

  } catch (error) {
    console.error("\n❌ Error:", error);

    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error("Error quitting driver:", quitError);
      }
    }

    process.exit(1);
  }
}

testCostumeWallProductNames()
  .then(() => {
    console.log("\n✅ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
