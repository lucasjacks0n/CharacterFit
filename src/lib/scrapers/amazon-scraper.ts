import { Builder, By, until, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";

export interface AmazonProductData {
  title: string;
  brand?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  material?: string;
  color?: string;
}

export class AmazonScraper {
  private driver: WebDriver | null = null;

  async initialize() {
    // Set the ChromeDriver path
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
    options.addArguments("--headless"); // Run in headless mode
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--disable-blink-features=AutomationControlled");
    options.addArguments(
      "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    this.driver = await new Builder()
      .forBrowser("chrome")
      .setChromeService(service)
      .setChromeOptions(options)
      .build();
  }

  async scrapeProduct(productUrl: string): Promise<AmazonProductData> {
    if (!this.driver) {
      throw new Error("Driver not initialized. Call initialize() first.");
    }

    try {
      await this.driver.get(productUrl);

      // Wait for the page to load
      await this.driver.wait(until.elementLocated(By.id("productTitle")), 10000);

      // Extract title
      const title = await this.safeGetText(By.id("productTitle"));

      // Extract brand
      const brand = await this.safeGetText(
        By.css("#bylineInfo, .po-brand .po-break-word")
      );

      // Extract price - try multiple strategies
      const price = await this.extractPrice();

      // Extract image
      const imageUrl = await this.safeGetAttribute(
        By.css("#landingImage, #imgBlkFront"),
        "src"
      );

      // Extract product description/features
      const description = await this.extractDescription();

      // Extract material and color from product details
      const { material, color } = await this.extractProductDetails();

      return {
        title: title.trim(),
        brand: brand?.trim() || undefined,
        price,
        description: description?.trim() || undefined,
        imageUrl: imageUrl || undefined,
        material: material || undefined,
        color: color || undefined,
      };
    } catch (error) {
      console.error("Error scraping Amazon product:", error);
      throw error;
    }
  }

  private async safeGetText(locator: By): Promise<string> {
    try {
      if (!this.driver) throw new Error("Driver not initialized");
      const element = await this.driver.wait(until.elementLocated(locator), 5000);
      return await element.getText();
    } catch {
      return "";
    }
  }

  private async safeGetAttribute(
    locator: By,
    attribute: string
  ): Promise<string | null> {
    try {
      if (!this.driver) throw new Error("Driver not initialized");
      const element = await this.driver.wait(until.elementLocated(locator), 5000);
      return await element.getAttribute(attribute);
    } catch {
      return null;
    }
  }

  private async extractDescription(): Promise<string | null> {
    try {
      if (!this.driver) return null;

      const sections: string[] = [];

      // 1. Get feature bullets - try multiple selectors
      try {
        // Try multiple bullet selectors
        const bulletSelectors = [
          "#feature-bullets li span.a-list-item",
          "#feature-bullets-btf li span.a-list-item",
          ".a-unordered-list.a-vertical.a-spacing-mini li",
          "#featurebullets_feature_div li",
        ];

        for (const selector of bulletSelectors) {
          const bullets = await this.driver.findElements(By.css(selector));
          if (bullets.length > 0) {
            const bulletTexts = await Promise.all(
              bullets.map((bullet) => bullet.getText())
            );
            const filteredBullets = bulletTexts
              .filter((text) => text.trim())
              .filter((text) => !text.toLowerCase().includes("see more")); // Filter out "See more" text
            if (filteredBullets.length > 0) {
              sections.push("FEATURES:\n" + filteredBullets.join("\n"));
              break; // Found bullets, stop looking
            }
          }
        }
      } catch {
        // Continue
      }

      // 2. Get product description - try multiple selectors
      try {
        const descSelectors = [
          "#productDescription p",
          "#productDescription",
          "#aplus_feature_div .aplus-module",
          ".aplus-v2 .apm-brand-story-text",
          "#productDescription_feature_div",
          ".a-expander-content.a-expander-partial-collapse-content",
        ];

        for (const selector of descSelectors) {
          try {
            const descElement = await this.driver.findElement(By.css(selector));
            const descText = await descElement.getText();
            if (descText && descText.trim() && descText.length > 30) {
              sections.push("DESCRIPTION:\n" + descText.trim());
              break; // Found description, stop looking
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Continue
      }

      // 3. Get product details/specifications
      try {
        const detailRows = await this.driver.findElements(
          By.css(
            "#productDetails_detailBullets_sections1 tr, .prodDetTable tr, #productDetails_techSpec_section_1 tr"
          )
        );
        if (detailRows.length > 0) {
          const details: string[] = [];
          for (const row of detailRows) {
            try {
              const text = await row.getText();
              if (text && text.trim()) {
                details.push(text.trim());
              }
            } catch {
              continue;
            }
          }
          if (details.length > 0) {
            sections.push("PRODUCT DETAILS:\n" + details.join("\n"));
          }
        }
      } catch {
        // Continue
      }

      // 4. Get any additional info from "About this item" section
      try {
        const aboutSection = await this.driver.findElement(
          By.css("#feature-bullets")
        );
        const aboutText = await aboutSection.getText();
        if (aboutText && aboutText.trim() && !sections.some(s => s.includes(aboutText.substring(0, 50)))) {
          sections.push("ABOUT THIS ITEM:\n" + aboutText.trim());
        }
      } catch {
        // Continue
      }

      // 5. Last resort - try to get any product overview/important information sections
      if (sections.length === 0) {
        try {
          // Try to get the entire product overview/description area
          const overviewSelectors = [
            "#productOverview_feature_div",
            "#poExpander",
            "#aplus",
            "#aplus_feature_div",
            "#aplusBrandStory_feature_div",
          ];

          for (const selector of overviewSelectors) {
            try {
              const overview = await this.driver.findElement(By.css(selector));
              const overviewText = await overview.getText();
              if (overviewText && overviewText.trim() && overviewText.length > 50) {
                sections.push("PRODUCT OVERVIEW:\n" + overviewText.trim());
                break;
              }
            } catch {
              continue;
            }
          }
        } catch {
          // Continue
        }
      }

      // Combine all sections
      if (sections.length > 0) {
        return sections.join("\n\n");
      }

      return null;
    } catch {
      return null;
    }
  }

  private async extractProductDetails(): Promise<{
    material?: string;
    color?: string;
  }> {
    try {
      if (!this.driver) return {};

      const details: { material?: string; color?: string } = {};

      // Strategy 1: Try to get color from title or breadcrumb
      try {
        // Check if color is in the page title (like "Royal Blue")
        const titleElement = await this.driver.findElement(By.id("productTitle"));
        const titleText = await titleElement.getText();

        // Look for common color words in the title
        const colorWords = [
          "black", "white", "blue", "red", "green", "yellow", "orange", "purple",
          "pink", "brown", "gray", "grey", "navy", "royal", "teal", "maroon",
          "olive", "tan", "beige", "cream", "burgundy", "charcoal", "khaki"
        ];

        const titleLower = titleText.toLowerCase();
        for (const color of colorWords) {
          if (titleLower.includes(color)) {
            // Extract the color and possible modifier
            const colorRegex = new RegExp(`(\\w+\\s)?${color}(\\s\\w+)?`, "i");
            const match = titleText.match(colorRegex);
            if (match) {
              details.color = match[0].trim();
              break;
            }
          }
        }
      } catch {
        // Continue
      }

      // Strategy 2: Try to get color from selected variation
      if (!details.color) {
        const variationSelectors = [
          "#variation_color_name .selection",
          ".po-color .po-break-word",
          "[data-csa-c-content-id='variation_color_name'] .selection",
          "#inline-twister-expanded-dimension-text-color_name",
          ".twisterTextDiv.text span"
        ];

        for (const selector of variationSelectors) {
          try {
            const colorElement = await this.driver.findElement(By.css(selector));
            const colorText = await colorElement.getText();
            if (colorText && colorText.trim()) {
              details.color = colorText.trim();
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // Strategy 2: Try to find product details table
      const rows = await this.driver.findElements(
        By.css("#productDetails_detailBullets_sections1 tr, .prodDetTable tr, #productDetails_techSpec_section_1 tr")
      );

      for (const row of rows) {
        try {
          const text = await row.getText();
          const lowerText = text.toLowerCase();

          if (lowerText.includes("material") || lowerText.includes("fabric")) {
            const parts = text.split(/[:：]/);
            if (parts.length > 1) {
              details.material = parts[1].trim();
            }
          }

          if (!details.color && (lowerText.includes("color") || lowerText.includes("colour"))) {
            const parts = text.split(/[:：]/);
            if (parts.length > 1) {
              details.color = parts[1].trim();
            }
          }
        } catch {
          continue;
        }
      }

      // Strategy 3: Try to get color from feature bullets
      if (!details.color) {
        try {
          const bullets = await this.driver.findElements(
            By.css("#feature-bullets li")
          );
          for (const bullet of bullets) {
            const text = await bullet.getText();
            const colorMatch = text.match(/color[:\s]+([a-zA-Z\s]+)/i);
            if (colorMatch) {
              details.color = colorMatch[1].trim();
              break;
            }
          }
        } catch {
          // Color not found
        }
      }

      return details;
    } catch {
      return {};
    }
  }

  private async extractPrice(): Promise<number | undefined> {
    if (!this.driver) return undefined;

    // Strategy 1: Try offscreen price (most reliable, includes full price with cents)
    try {
      const offscreenPrice = await this.driver.findElement(
        By.css(".a-price .a-offscreen")
      );
      const priceText = await offscreenPrice.getText();
      const parsed = this.parsePrice(priceText);
      if (parsed) return parsed;
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Try to combine whole and fraction parts
    try {
      const wholeElement = await this.driver.findElement(
        By.css(".a-price-whole")
      );
      const whole = await wholeElement.getText();

      let fraction = "00";
      try {
        const fractionElement = await this.driver.findElement(
          By.css(".a-price-fraction")
        );
        fraction = await fractionElement.getText();
      } catch {
        // No fraction, default to .00
      }

      const combinedPrice =
        whole.replace(/[^0-9]/g, "") + "." + fraction.replace(/[^0-9]/g, "");
      const parsed = parseFloat(combinedPrice);
      if (!isNaN(parsed)) return parsed;
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Try other common selectors
    const fallbackSelectors = [
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      ".apexPriceToPay .a-offscreen",
      "span.a-price span.a-offscreen",
    ];

    for (const selector of fallbackSelectors) {
      try {
        const element = await this.driver.findElement(By.css(selector));
        const priceText = await element.getText();
        const parsed = this.parsePrice(priceText);
        if (parsed) return parsed;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private parsePrice(priceText: string): number | undefined {
    if (!priceText) return undefined;

    // Remove currency symbols and extract numbers
    const cleaned = priceText.replace(/[^0-9.,]/g, "");
    const normalized = cleaned.replace(/,/g, "");
    const price = parseFloat(normalized);

    return isNaN(price) ? undefined : price;
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }
}

// Helper function to scrape a single product
export async function scrapeAmazonProduct(
  productUrl: string
): Promise<AmazonProductData> {
  const scraper = new AmazonScraper();
  try {
    await scraper.initialize();
    return await scraper.scrapeProduct(productUrl);
  } finally {
    await scraper.close();
  }
}
