import { scrapeAmazonProduct } from "./src/lib/scrapers/amazon-scraper";

const url =
  "https://www.amazon.com/dp/B0CVX4DV63/";

async function testScraper() {
  console.log("Starting scraper test...");
  console.log("URL:", url);
  console.log("\n");

  try {
    const data = await scrapeAmazonProduct(url);
    console.log("✅ Scraping successful!\n");
    console.log("Title:", data.title);
    console.log("Brand:", data.brand);
    console.log("Price:", data.price);
    console.log("Color:", data.color || "NOT FOUND");
    console.log("Material:", data.material || "NOT FOUND");
    console.log("Image URL:", data.imageUrl);
    console.log("\nDescription:");
    console.log(data.description || "NOT FOUND");
  } catch (error) {
    console.error("❌ Scraping failed:");
    console.error((error as Error).message);
    console.error("\nFull error:", error);
  }
}

testScraper();
