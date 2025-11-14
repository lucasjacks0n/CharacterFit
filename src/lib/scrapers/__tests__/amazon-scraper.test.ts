import { AmazonScraper, scrapeAmazonProduct } from "../amazon-scraper";
import { Builder, By, WebDriver, WebElement } from "selenium-webdriver";

// Mock selenium-webdriver
jest.mock("selenium-webdriver", () => {
  const actualModule = jest.requireActual("selenium-webdriver");
  return {
    ...actualModule,
    Builder: jest.fn(),
  };
});

describe("AmazonScraper", () => {
  let scraper: AmazonScraper;
  let mockDriver: jest.Mocked<WebDriver>;
  let mockElement: jest.Mocked<WebElement>;

  beforeEach(() => {
    // Create mock WebElement
    mockElement = {
      getText: jest.fn(),
      getAttribute: jest.fn(),
      click: jest.fn(),
      sendKeys: jest.fn(),
      isDisplayed: jest.fn(),
      isEnabled: jest.fn(),
      isSelected: jest.fn(),
      submit: jest.fn(),
      clear: jest.fn(),
      getTagName: jest.fn(),
      getCssValue: jest.fn(),
      findElement: jest.fn(),
      findElements: jest.fn(),
      getRect: jest.fn(),
      takeScreenshot: jest.fn(),
      getId: jest.fn(),
    } as any;

    // Create mock WebDriver
    mockDriver = {
      get: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      wait: jest.fn().mockResolvedValue(mockElement),
      findElement: jest.fn().mockResolvedValue(mockElement),
      findElements: jest.fn().mockResolvedValue([mockElement]),
      close: jest.fn(),
      getCurrentUrl: jest.fn(),
      getTitle: jest.fn(),
      executeScript: jest.fn(),
      navigate: jest.fn(),
      switchTo: jest.fn(),
      manage: jest.fn(),
      actions: jest.fn(),
    } as any;

    // Mock Builder chain
    const mockBuilder = {
      forBrowser: jest.fn().mockReturnThis(),
      setChromeOptions: jest.fn().mockReturnThis(),
      build: jest.fn().mockResolvedValue(mockDriver),
    };

    (Builder as jest.MockedClass<typeof Builder>).mockImplementation(
      () => mockBuilder as any
    );

    scraper = new AmazonScraper();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize the driver with correct options", async () => {
      await scraper.initialize();

      expect(Builder).toHaveBeenCalled();
      const builderInstance = (Builder as jest.Mock).mock.results[0].value;
      expect(builderInstance.forBrowser).toHaveBeenCalledWith("chrome");
      expect(builderInstance.setChromeOptions).toHaveBeenCalled();
      expect(builderInstance.build).toHaveBeenCalled();
    });
  });

  describe("scrapeProduct", () => {
    beforeEach(async () => {
      await scraper.initialize();
    });

    it("should throw error if driver not initialized", async () => {
      const uninitializedScraper = new AmazonScraper();
      await expect(
        uninitializedScraper.scrapeProduct("https://amazon.com/product")
      ).rejects.toThrow("Driver not initialized");
    });

    it("should scrape product data successfully", async () => {
      // Mock responses
      mockElement.getText.mockImplementation(async () => {
        return "Test Product Title";
      });

      mockDriver.findElements.mockResolvedValue([mockElement]);
      mockElement.getAttribute.mockResolvedValue(
        "https://example.com/image.jpg"
      );

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(mockDriver.get).toHaveBeenCalledWith(
        "https://amazon.com/product/123"
      );
      expect(result.title).toBe("Test Product Title");
    });

    it("should extract title from product page", async () => {
      mockElement.getText.mockResolvedValue("Amazon Essentials Women's Leggings");

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.title).toBe("Amazon Essentials Women's Leggings");
    });

    it("should extract and parse price correctly", async () => {
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product Title";
        if (callCount === 2) return "Brand Name";
        if (callCount === 3) return "$24.99";
        return "";
      });

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.price).toBe(24.99);
    });

    it("should handle price with comma correctly", async () => {
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product Title";
        if (callCount === 2) return "Brand Name";
        if (callCount === 3) return "$1,234.56";
        return "";
      });

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.price).toBe(1234.56);
    });

    it("should extract brand name", async () => {
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product Title";
        if (callCount === 2) return "Amazon Essentials";
        return "";
      });

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.brand).toBe("Amazon Essentials");
    });

    it("should extract image URL", async () => {
      mockElement.getText.mockResolvedValue("Product Title");
      mockElement.getAttribute.mockResolvedValue(
        "https://m.media-amazon.com/images/I/example.jpg"
      );

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.imageUrl).toBe(
        "https://m.media-amazon.com/images/I/example.jpg"
      );
    });

    it("should extract description from feature bullets", async () => {
      const mockBullets = [
        { getText: jest.fn().mockResolvedValue("Comfortable fit") },
        { getText: jest.fn().mockResolvedValue("Machine washable") },
        { getText: jest.fn().mockResolvedValue("Imported") },
      ];

      mockDriver.findElements.mockResolvedValue(mockBullets as any);
      mockElement.getText.mockResolvedValue("Product Title");

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.description).toContain("Comfortable fit");
      expect(result.description).toContain("Machine washable");
    });

    it("should extract material from product details", async () => {
      const mockRows = [
        {
          getText: jest
            .fn()
            .mockResolvedValue("Material: 95% Cotton, 5% Spandex"),
        },
      ];

      mockDriver.findElements.mockImplementation(async (locator: By) => {
        const locatorString = locator.toString();
        if (locatorString.includes("prodDetTable")) {
          return mockRows as any;
        }
        return [mockElement];
      });

      mockElement.getText.mockResolvedValue("Product Title");

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.material).toBe("95% Cotton, 5% Spandex");
    });

    it("should extract color from product details", async () => {
      const mockRows = [
        { getText: jest.fn().mockResolvedValue("Color: Navy Blue") },
      ];

      mockDriver.findElements.mockImplementation(async (locator: By) => {
        const locatorString = locator.toString();
        if (locatorString.includes("prodDetTable")) {
          return mockRows as any;
        }
        return [mockElement];
      });

      mockElement.getText.mockResolvedValue("Product Title");

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.color).toBe("Navy Blue");
    });

    it("should handle missing optional fields gracefully", async () => {
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product Title"; // title
        return ""; // brand, price, etc. all return empty
      });

      mockDriver.findElements.mockResolvedValue([]);
      mockElement.getAttribute.mockResolvedValue(null);

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.title).toBe("Product Title");
      expect(result.brand).toBeUndefined();
      expect(result.price).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.material).toBeUndefined();
      expect(result.color).toBeUndefined();
    });

    it("should trim whitespace from extracted data", async () => {
      mockElement.getText.mockResolvedValue("  Product With Spaces  ");

      const result = await scraper.scrapeProduct(
        "https://amazon.com/product/123"
      );

      expect(result.title).toBe("Product With Spaces");
    });
  });

  describe("close", () => {
    it("should quit the driver", async () => {
      await scraper.initialize();
      await scraper.close();

      expect(mockDriver.quit).toHaveBeenCalled();
    });

    it("should handle close when driver is not initialized", async () => {
      await expect(scraper.close()).resolves.not.toThrow();
    });
  });

  describe("parsePrice", () => {
    it("should parse price with dollar sign", async () => {
      await scraper.initialize();
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product";
        if (callCount === 2) return "Brand";
        if (callCount === 3) return "$29.99";
        return "";
      });

      const result = await scraper.scrapeProduct("https://amazon.com/test");
      expect(result.price).toBe(29.99);
    });

    it("should handle price without decimals", async () => {
      await scraper.initialize();
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product";
        if (callCount === 2) return "Brand";
        if (callCount === 3) return "$25";
        return "";
      });

      const result = await scraper.scrapeProduct("https://amazon.com/test");
      expect(result.price).toBe(25);
    });

    it("should handle invalid price format", async () => {
      await scraper.initialize();
      let callCount = 0;
      mockElement.getText.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return "Product";
        if (callCount === 2) return "Brand";
        if (callCount === 3) return "N/A";
        return "";
      });

      const result = await scraper.scrapeProduct("https://amazon.com/test");
      expect(result.price).toBeUndefined();
    });
  });
});

describe("scrapeAmazonProduct", () => {
  let mockDriver: jest.Mocked<WebDriver>;
  let mockElement: jest.Mocked<WebElement>;

  beforeEach(() => {
    mockElement = {
      getText: jest.fn().mockResolvedValue("Test Product"),
      getAttribute: jest.fn().mockResolvedValue(null),
    } as any;

    mockDriver = {
      get: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      wait: jest.fn().mockResolvedValue(mockElement),
      findElement: jest.fn().mockResolvedValue(mockElement),
      findElements: jest.fn().mockResolvedValue([]),
    } as any;

    const mockBuilder = {
      forBrowser: jest.fn().mockReturnThis(),
      setChromeOptions: jest.fn().mockReturnThis(),
      build: jest.fn().mockResolvedValue(mockDriver),
    };

    (Builder as jest.MockedClass<typeof Builder>).mockImplementation(
      () => mockBuilder as any
    );
  });

  it("should scrape product and close driver", async () => {
    const result = await scrapeAmazonProduct("https://amazon.com/product");

    expect(result.title).toBe("Test Product");
    expect(mockDriver.quit).toHaveBeenCalled();
  });

  it("should close driver even if scraping fails", async () => {
    mockDriver.get.mockRejectedValue(new Error("Network error"));

    await expect(
      scrapeAmazonProduct("https://amazon.com/product")
    ).rejects.toThrow();

    expect(mockDriver.quit).toHaveBeenCalled();
  });
});
