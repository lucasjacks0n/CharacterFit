// Test script for CostumeWall scraper
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

async function testCostumeWallScraper() {
  const testUrl = "https://costumewall.com/dress-like-squid-game-guard/";
  let driver;

  try {
    console.log(`Testing CostumeWall scraper with: ${testUrl}\n`);

    // Set up Chrome options
    const options = new chrome.Options();
    options.addArguments("--headless");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--disable-gpu");
    options.addArguments(
      "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // Navigate to the CostumeWall page
    await driver.get(testUrl);

    // Wait for page to load
    await driver.wait(until.elementLocated(By.css("body")), 10000);

    // Wait a bit for dynamic content
    await driver.sleep(2000);

    // Find all Amazon links on the page
    const links = await driver.findElements(By.css("a[href*='amazon.com']"));

    const amazonUrls: string[] = [];
    const seenUrls = new Set<string>();

    console.log(`Found ${links.length} total Amazon links\n`);

    for (const link of links) {
      try {
        const href = await link.getAttribute("href");
        if (href && (href.includes("amazon.com/dp/") || href.includes("amazon.com/gp/product/"))) {
          // Extract just the product URL (remove any tracking params after ASIN)
          const asinMatch = href.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (asinMatch) {
            const asin = asinMatch[2];
            const cleanUrl = `https://www.amazon.com/dp/${asin}`;

            // Only add if we haven't seen this ASIN yet
            if (!seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);
              amazonUrls.push(cleanUrl);
              console.log(`${amazonUrls.length}. ${cleanUrl}`);
            }
          }
        }
      } catch (err) {
        // Skip this link if there's an error
        console.error("Error processing link:", err);
      }
    }

    await driver.quit();

    console.log(`\n✅ Successfully found ${amazonUrls.length} unique Amazon products`);

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

testCostumeWallScraper()
  .then(() => {
    console.log("\n✅ Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
