// Debug script v2 - wait longer and check page title
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

async function debugCostumeWall() {
  const testUrl = "https://costumewall.com/dress-like-squid-game-guard/";
  let driver;

  try {
    console.log(`Debugging CostumeWall page: ${testUrl}\n`);

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

    // Navigate to the page
    await driver.get(testUrl);
    console.log("Page loaded");

    // Wait for page to load
    await driver.wait(until.elementLocated(By.css("body")), 15000);
    console.log("Body element found");

    // Get page title
    const title = await driver.getTitle();
    console.log(`Page title: ${title}\n`);

    // Wait longer for JS to execute
    console.log("Waiting 5 seconds for JavaScript...");
    await driver.sleep(5000);

    // Try to get the page source
    const pageSource = await driver.getPageSource();
    console.log(`Page source length: ${pageSource.length} characters`);

    // Check if page contains "amazon"
    if (pageSource.toLowerCase().includes("amazon")) {
      console.log("✅ Page contains 'amazon' text");

      // Count occurrences
      const amazonCount = (pageSource.match(/amazon/gi) || []).length;
      console.log(`Found ${amazonCount} occurrences of 'amazon'`);

      // Look for product links in various formats
      const dpPattern = /amazon\.com\/dp\/[A-Z0-9]{10}/gi;
      const dpMatches = pageSource.match(dpPattern);
      if (dpMatches) {
        console.log(`\nFound ${dpMatches.length} /dp/ links:`);
        const unique = [...new Set(dpMatches)];
        unique.forEach((match, i) => {
          console.log(`${i + 1}. https://www.${match}`);
        });
      }

      const gpPattern = /amazon\.com\/gp\/product\/[A-Z0-9]{10}/gi;
      const gpMatches = pageSource.match(gpPattern);
      if (gpMatches) {
        console.log(`\nFound ${gpMatches.length} /gp/product/ links:`);
        const unique = [...new Set(gpMatches)];
        unique.forEach((match, i) => {
          console.log(`${i + 1}. https://www.${match}`);
        });
      }
    } else {
      console.log("❌ Page does not contain 'amazon' text");
    }

    // Try different selectors
    console.log("\n\nTrying different selectors...");

    const selectors = [
      "a[href*='amazon']",
      "a[href*='amzn']",
      ".product-link",
      ".affiliate-link",
      "[data-product]",
      ".wp-block-button__link",
      ".button",
    ];

    for (const selector of selectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        }
      } catch (err) {
        // Skip
      }
    }

    await driver.quit();

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

debugCostumeWall()
  .then(() => {
    console.log("\n✅ Debug complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Debug failed:", error);
    process.exit(1);
  });
