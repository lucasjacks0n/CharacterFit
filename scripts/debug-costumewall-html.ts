// Debug script to inspect CostumeWall HTML structure
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";

async function debugCostumeWallHTML() {
  const testUrl = "https://costumewall.com/dress-like-squid-game-guard/";
  let driver;

  try {
    console.log(`Inspecting HTML structure: ${testUrl}\n`);

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

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeService(service)
      .setChromeOptions(options)
      .build();

    await driver.get(testUrl);
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    await driver.sleep(2000);

    // Find first Amazon link
    const links = await driver.findElements(By.css("a[href*='amazon.com']"));

    if (links.length === 0) {
      console.log("No Amazon links found!");
      await driver.quit();
      return;
    }

    console.log(`Found ${links.length} Amazon links. Inspecting first one...\n`);

    const firstLink = links[0];

    // Get link info
    const href = await firstLink.getAttribute("href");
    const linkText = await firstLink.getText();
    const innerHTML = await firstLink.getAttribute("innerHTML");
    const outerHTML = await firstLink.getAttribute("outerHTML");

    console.log("LINK DETAILS:");
    console.log("=".repeat(80));
    console.log(`Href: ${href}`);
    console.log(`Link text (getText()): "${linkText}"`);
    console.log(`\nInner HTML:\n${innerHTML.substring(0, 300)}${innerHTML.length > 300 ? "..." : ""}`);
    console.log(`\nOuter HTML:\n${outerHTML.substring(0, 500)}${outerHTML.length > 500 ? "..." : ""}`);

    // Check parent element
    const parent = await driver.executeScript("return arguments[0].parentElement;", firstLink);
    const parentTagName = await driver.executeScript("return arguments[0].tagName;", parent) as string;
    const parentText = await driver.executeScript("return arguments[0].textContent;", parent) as string;
    const parentHTML = await driver.executeScript("return arguments[0].outerHTML;", parent) as string;

    console.log("\n\nPARENT ELEMENT:");
    console.log("=".repeat(80));
    console.log(`Tag: ${parentTagName}`);
    console.log(`Text content: "${parentText.substring(0, 200)}${parentText.length > 200 ? "..." : ""}"`);
    console.log(`\nOuter HTML:\n${parentHTML.substring(0, 500)}${parentHTML.length > 500 ? "..." : ""}`);

    // Try to find nearby headings or text
    const nearbyH2 = await driver.executeScript(`
      const link = arguments[0];
      const parent = link.closest('div, section, article');
      if (parent) {
        const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
        return heading ? heading.textContent : null;
      }
      return null;
    `, firstLink);

    const nearbyText = await driver.executeScript(`
      const link = arguments[0];
      const parent = link.closest('div, section, article');
      if (parent) {
        const allText = parent.textContent.trim();
        return allText.substring(0, 200);
      }
      return null;
    `, firstLink);

    console.log("\n\nNEARBY CONTENT:");
    console.log("=".repeat(80));
    console.log(`Nearby heading: "${nearbyH2}"`);
    console.log(`Nearby text: "${nearbyText}"`);

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

debugCostumeWallHTML()
  .then(() => {
    console.log("\n✅ Debug complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Debug failed:", error);
    process.exit(1);
  });
