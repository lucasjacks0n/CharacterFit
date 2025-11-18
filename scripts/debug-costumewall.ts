// Debug script to see what's on the CostumeWall page
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

    // Wait for page to load
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    await driver.sleep(3000);

    // Get all links
    const allLinks = await driver.findElements(By.css("a"));
    console.log(`Total <a> tags found: ${allLinks.length}\n`);

    // Get a sample of hrefs
    console.log("Sample of hrefs found:");
    for (let i = 0; i < Math.min(20, allLinks.length); i++) {
      try {
        const href = await allLinks[i].getAttribute("href");
        if (href) {
          console.log(`${i + 1}. ${href}`);
        }
      } catch (err) {
        // Skip
      }
    }

    // Try to find any links containing "amazon"
    console.log("\n\nSearching for links containing 'amazon'...");
    const bodyText = await driver.findElement(By.css("body")).getAttribute("innerHTML");
    const amazonMatches = bodyText.match(/href="[^"]*amazon[^"]*/gi);

    if (amazonMatches) {
      console.log(`\nFound ${amazonMatches.length} hrefs containing 'amazon':`);
      amazonMatches.slice(0, 10).forEach((match, i) => {
        console.log(`${i + 1}. ${match}`);
      });
    } else {
      console.log("No hrefs containing 'amazon' found in HTML");
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
