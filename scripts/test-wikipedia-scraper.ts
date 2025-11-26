/**
 * Test the actual Wikipedia API to see the format
 */

import { fetchWikipediaSummary } from '../src/lib/wikipedia';

async function testWikipediaScraper() {
  console.log('\n========== Testing Wikipedia Scraper ==========\n');

  // Test 1: Fetch a section URL
  const testUrl = 'https://en.wikipedia.org/wiki/Order_of_the_Phoenix_(fictional_organisation)#James_Potter';

  console.log(`Fetching: ${testUrl}\n`);

  const result = await fetchWikipediaSummary(testUrl);

  if (result.success) {
    console.log(`✅ Success!`);
    console.log(`Title: ${result.title}`);
    console.log(`URL: ${result.url}`);
    console.log(`Content length: ${result.summary?.length || 0} characters\n`);

    // Show first 500 chars
    console.log(`First 500 characters:\n${result.summary?.substring(0, 500)}...\n`);

    // Check if it contains content from other sections
    const containsLily = result.summary?.includes('Lily Potter');
    const containsSirius = result.summary?.includes('Sirius Black');

    console.log(`\n--- Content Check ---`);
    console.log(`Contains "Lily Potter": ${containsLily}`);
    console.log(`Contains "Sirius Black": ${containsSirius} (expected: may appear as mentioned friend)`);

    // Show where Lily Potter appears if it does
    if (containsLily && result.summary) {
      const lilyIndex = result.summary.indexOf('Lily Potter');
      console.log(`\n"Lily Potter" found at index ${lilyIndex}`);
      console.log(`Context: ...${result.summary.substring(Math.max(0, lilyIndex - 50), lilyIndex + 100)}...`);
    }
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
}

testWikipediaScraper().catch(console.error);
