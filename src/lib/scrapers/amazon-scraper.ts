import { Builder, By, until, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import path from "path";

export interface AmazonProductData {
  title: string;
  brand?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
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
      await this.driver.wait(
        until.elementLocated(By.id("productTitle")),
        10000
      );

      // Give extra time for dynamic content to load
      await this.driver.sleep(3000);

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

      // Extract color from product details
      const color = await this.extractColor();

      return {
        title: title.trim(),
        brand: brand?.trim() || undefined,
        price,
        description: description?.trim() || undefined,
        imageUrl: imageUrl || undefined,
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
      const element = await this.driver.wait(
        until.elementLocated(locator),
        5000
      );
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
      const element = await this.driver.wait(
        until.elementLocated(locator),
        5000
      );
      return await element.getAttribute(attribute);
    } catch {
      return null;
    }
  }

  private async extractDescription(): Promise<string | null> {
    try {
      if (!this.driver) return null;

      const allText: string[] = [];
      const seenText = new Set<string>(); // Avoid duplicates

      // Helper to add text if not duplicate and not reviews
      const addText = (text: string, label?: string) => {
        const cleaned = text.trim();
        const lower = cleaned.toLowerCase();
        const key = lower.substring(0, 100); // Use first 100 chars as key

        // Filter out review-related content and brand story
        const reviewIndicators = [
          "verified purchase",
          "reviewed in",
          "customer reviews:",
          "out of 5 stars",
          "one person found this helpful",
          "people found this helpful",
          "report",
          "translate review",
          "from the brand",
          "brand story",
        ];

        const hasReviewContent = reviewIndicators.some((indicator) =>
          lower.includes(indicator)
        );

        if (
          cleaned &&
          cleaned.length > 20 &&
          !seenText.has(key) &&
          !hasReviewContent
        ) {
          seenText.add(key);
          allText.push(label ? `${label}:\n${cleaned}` : cleaned);
        }
      };

      // 1. Feature bullets / About this item - try finding by text first
      try {
        const texts: string[] = [];

        // Strategy 1: Find by "About this item" heading and get nearby list
        try {
          const heading = await this.driver.findElement(
            By.xpath("//*[contains(text(), 'About this item')]")
          );

          // Simple approach: Get the very next UL sibling (or nearby sibling)
          const ul = await heading.findElement(
            By.xpath(
              "./following-sibling::ul[1] | ./parent::*/following-sibling::ul[1] | ./parent::*/ul[1]"
            )
          );

          // Get all list items
          const lis = await ul.findElements(By.css("li"));

          for (const li of lis) {
            try {
              const text = await li.getText();
              const cleaned = text.trim();
              const lower = cleaned.toLowerCase();

              // Stop if we hit the reviews section
              if (
                lower.includes("customer reviews") ||
                lower.includes("out of 5 stars") ||
                lower.includes("verified purchase") ||
                lower.includes("reviewed in")
              ) {
                break;
              }

              // Skip navigation/UI elements, headings, and empty content
              if (
                cleaned.length > 15 &&
                !lower.includes("see more") &&
                !lower.includes("see less") &&
                !lower.includes("report") &&
                !lower.includes("translate review") &&
                !lower.includes("about this item")
              ) {
                texts.push(cleaned);
              }

              // Only take first 15 bullets to avoid reviews
              if (texts.length >= 15) {
                break;
              }
            } catch (err) {
              continue;
            }
          }
        } catch (err) {}

        // Strategy 2: Try standard selectors if heading approach didn't work
        if (texts.length === 0) {
          const bulletSelectors = [
            "#productFactsDesktop_feature_div ul li span",
            "#featurebullets_feature_div ul li span",
            "#featurebullets_feature_div li",
            "#feature-bullets ul li span.a-list-item",
            "#feature-bullets-btf ul li span.a-list-item",
            "#feature-bullets li span",
            "#feature-bullets li",
            ".a-unordered-list.a-vertical.a-spacing-mini li",
          ];

          for (const selector of bulletSelectors) {
            try {
              const bullets = await this.driver.findElements(By.css(selector));

              if (bullets.length === 0) continue;

              for (const bullet of bullets) {
                try {
                  const text = await bullet.getText();
                  const cleaned = text.trim();
                  const lower = cleaned.toLowerCase();

                  if (
                    lower.includes("customer reviews") ||
                    lower.includes("out of 5 stars") ||
                    lower.includes("verified purchase") ||
                    lower.includes("reviewed in")
                  ) {
                    break;
                  }

                  if (
                    cleaned.length > 15 &&
                    !lower.includes("see more") &&
                    !lower.includes("see less") &&
                    !lower.includes("report") &&
                    !lower.includes("translate review")
                  ) {
                    texts.push(cleaned);
                  }

                  if (texts.length >= 15) break;
                } catch {
                  continue;
                }
              }

              if (texts.length > 0) break;
            } catch {
              continue;
            }
          }
        }

        if (texts.length > 0) {
          const joined = texts.join("\n");
          const key = joined.toLowerCase().substring(0, 100);
          if (!seenText.has(key)) {
            seenText.add(key);
            allText.push("ABOUT THIS ITEM:\n" + joined);
          }
        } else {
        }
      } catch (err) {}

      // 2. Product description
      try {
        const descSelectors = [
          "#productDescription",
          "#productDescription_feature_div",
          "#productDescription p",
        ];

        for (const selector of descSelectors) {
          try {
            const elem = await this.driver.findElement(By.css(selector));
            const text = await elem.getText();
            addText(text, "PRODUCT DESCRIPTION");
            break;
          } catch (err) {
            continue;
          }
        }
      } catch (err) {}

      // 3. A+ Content / Enhanced content
      try {
        const aplusSelectors = [
          "#aplus",
          "#aplus_feature_div",
          "#aplusBrandStory_feature_div",
        ];

        for (const selector of aplusSelectors) {
          try {
            const elem = await this.driver.findElement(By.css(selector));
            const text = await elem.getText();
            addText(text, "ENHANCED CONTENT");
            break;
          } catch {
            continue;
          }
        }
      } catch {
        // Continue
      }

      // 4. Product details table - capture all specification details
      try {
        const detailSelectors = [
          "#productDetails_detailBullets_sections1 tr",
          ".prodDetTable tr",
          "#productDetails_techSpec_section_1 tr",
          "#productDetails_techSpec_section_2 tr",
          "#productDetails_db_sections tr",
          ".a-keyvalue tr",
        ];

        const details: string[] = [];
        const seenDetails = new Set<string>();

        for (const selector of detailSelectors) {
          try {
            const detailRows = await this.driver.findElements(By.css(selector));
            for (const row of detailRows) {
              try {
                const text = await row.getText();
                const cleaned = text.trim();
                const lower = cleaned.toLowerCase();

                // Skip Best Sellers Rank and Customer Reviews as per plan
                if (
                  cleaned &&
                  cleaned.length > 5 &&
                  !lower.includes("best sellers rank") &&
                  !lower.includes("customer reviews") &&
                  !seenDetails.has(cleaned.substring(0, 50))
                ) {
                  seenDetails.add(cleaned.substring(0, 50));
                  details.push(cleaned);
                }
              } catch {
                continue;
              }
            }
          } catch {
            continue;
          }
        }

        if (details.length > 0) {
          addText(details.join("\n"), "PRODUCT DETAILS");
        }
      } catch {
        // Continue
      }

      // 4b. Additional product information sections
      try {
        const additionalInfoSelectors = [
          "#productFactsDesktop_feature_div",
          "#productDetails_feature_div",
          "#detailBullets_feature_div",
          "#detailBulletsWrapper_feature_div",
        ];

        for (const selector of additionalInfoSelectors) {
          try {
            const section = await this.driver.findElement(By.css(selector));
            const text = await section.getText();
            const cleaned = text.trim();
            console.log("debug: cleaned", cleaned, "end debug");
            const lower = cleaned.toLowerCase();

            // Filter out unwanted sections
            if (
              cleaned &&
              !lower.includes("best sellers rank") &&
              !lower.includes("customer reviews")
            ) {
              addText(cleaned, "ADDITIONAL INFORMATION");
              break; // Only take the first match to avoid duplicates
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Continue
      }

      // 5. Product overview
      try {
        const overviewElem = await this.driver.findElement(
          By.css("#productOverview_feature_div")
        );
        const text = await overviewElem.getText();
        addText(text, "PRODUCT OVERVIEW");
      } catch {
        // Continue
      }

      // 6. Care instructions and fabric details
      try {
        const careSelectors = [
          ".po-fabric_type",
          ".po-care_instructions",
          ".po-material_composition",
          "[data-feature-name='CARE_INSTRUCTIONS']",
          "[data-feature-name='FABRIC_TYPE']",
        ];

        for (const selector of careSelectors) {
          try {
            const elements = await this.driver.findElements(By.css(selector));
            for (const elem of elements) {
              const text = await elem.getText();
              if (text && text.trim().length > 10) {
                addText(text.trim(), "CARE & FABRIC");
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Continue
      }

      // Combine all sections
      if (allText.length > 0) {
        return allText.join("\n\n");
      }

      return null;
    } catch {
      return null;
    }
  }

  private async extractColor(): Promise<string | undefined> {
    try {
      if (!this.driver) return undefined;

      // Strategy 1: Try to get color from selected variation
      const variationSelectors = [
        "#variation_color_name .selection",
        ".po-color .po-break-word",
        "[data-csa-c-content-id='variation_color_name'] .selection",
        "#inline-twister-expanded-dimension-text-color_name",
        ".twisterTextDiv.text span",
      ];

      for (const selector of variationSelectors) {
        try {
          const colorElement = await this.driver.findElement(By.css(selector));
          const colorText = await colorElement.getText();
          if (colorText && colorText.trim()) {
            return colorText.trim();
          }
        } catch {
          continue;
        }
      }

      // Strategy 2: Try to get color from title
      try {
        const titleElement = await this.driver.findElement(
          By.id("productTitle")
        );
        const titleText = await titleElement.getText();

        // Look for common color words in the title
        const colorWords = [
          "black",
          "white",
          "blue",
          "red",
          "green",
          "yellow",
          "orange",
          "purple",
          "pink",
          "brown",
          "gray",
          "grey",
          "navy",
          "royal",
          "teal",
          "maroon",
          "olive",
          "tan",
          "beige",
          "cream",
          "burgundy",
          "charcoal",
          "khaki",
        ];

        const titleLower = titleText.toLowerCase();
        for (const color of colorWords) {
          if (titleLower.includes(color)) {
            // Extract the color and possible modifier
            const colorRegex = new RegExp(`(\\w+\\s)?${color}(\\s\\w+)?`, "i");
            const match = titleText.match(colorRegex);
            if (match) {
              return match[0].trim();
            }
          }
        }
      } catch {
        // Continue
      }

      // Strategy 3: Try to get color from product details table
      const rows = await this.driver.findElements(
        By.css(
          "#productDetails_detailBullets_sections1 tr, .prodDetTable tr, #productDetails_techSpec_section_1 tr"
        )
      );

      for (const row of rows) {
        try {
          const text = await row.getText();
          const lowerText = text.toLowerCase();

          if (lowerText.includes("color") || lowerText.includes("colour")) {
            const parts = text.split(/[:：]/);
            if (parts.length > 1) {
              return parts[1].trim();
            }
          }
        } catch {
          continue;
        }
      }

      return undefined;
    } catch {
      return undefined;
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
