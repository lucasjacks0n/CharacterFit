/**
 * Test both Wikipedia API behaviors:
 * 1. Full article -> summary
 * 2. Section URL -> extract section
 */

import { fetchWikipediaSummary } from '../src/lib/wikipedia';

async function testBothApis() {
  console.log('\n========== TEST 1: Full Article (should use summary API) ==========\n');

  const fullArticleUrl = 'https://en.wikipedia.org/wiki/The_Undertaker';
  console.log(`Fetching: ${fullArticleUrl}\n`);

  const summaryResult = await fetchWikipediaSummary(fullArticleUrl);

  if (summaryResult.success) {
    console.log(`✅ Success!`);
    console.log(`Title: ${summaryResult.title}`);
    console.log(`URL: ${summaryResult.url}`);
    console.log(`Content length: ${summaryResult.summary?.length || 0} characters`);
    console.log(`\nFirst 500 chars:\n${summaryResult.summary?.substring(0, 500)}...\n`);
  } else {
    console.log(`❌ Failed: ${summaryResult.error}`);
  }

  console.log('\n========== TEST 2: Section URL (should extract section) ==========\n');

  const sectionUrl = 'https://en.wikipedia.org/wiki/Order_of_the_Phoenix_(fictional_organisation)#James_Potter';
  console.log(`Fetching: ${sectionUrl}\n`);

  const sectionResult = await fetchWikipediaSummary(sectionUrl);

  if (sectionResult.success) {
    console.log(`✅ Success!`);
    console.log(`Title: ${sectionResult.title}`);
    console.log(`URL: ${sectionResult.url}`);
    console.log(`Content length: ${sectionResult.summary?.length || 0} characters`);
    console.log(`\nFirst 500 chars:\n${sectionResult.summary?.substring(0, 500)}...\n`);

    // Verify it doesn't contain the next section
    console.log(`Contains "Lily Potter": ${sectionResult.summary?.includes('Lily Potter')}`);
  } else {
    console.log(`❌ Failed: ${sectionResult.error}`);
  }
}

testBothApis().catch(console.error);
