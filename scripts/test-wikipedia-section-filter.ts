/**
 * Test Wikipedia API and section filtering with real data
 */

async function fetchWikipediaPlainText(pageTitle: string) {
  // Try with exsectionformat=wiki instead of explaintext to preserve headers
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=wiki&titles=${encodeURIComponent(pageTitle)}&origin=*`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'CharacterFits/1.0 (https://characterfits.com; contact@characterfits.com)',
    },
  });

  const data = await response.json();
  const pages = data.query?.pages;
  const pageId = Object.keys(pages)[0];
  const page = pages[pageId];

  console.log('API URL:', apiUrl);
  console.log('First 1000 chars of raw response:', page.extract?.substring(0, 1000));

  return page.extract || '';
}

function filterToSection(fullText: string, sectionName: string): string {
  const normalizedSectionName = sectionName.replace(/_/g, ' ').trim();
  const escapedName = normalizedSectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const sectionHeaderPattern = new RegExp(
    `^(===*|==)\\s*${escapedName}\\s*(===*|==)\\s*$`,
    'im'
  );

  const match = fullText.match(sectionHeaderPattern);

  if (!match) {
    console.warn(`❌ Section "${sectionName}" not found`);
    return fullText;
  }

  console.log(`✅ Found section header: "${match[0].trim()}"`);

  const sectionStartIndex = match.index! + match[0].length;
  const contentAfterSection = fullText.substring(sectionStartIndex);

  const nextSectionPattern = /^(===*|==)\s*.+?\s*(===*|==)\s*$/m;
  const nextSectionMatch = contentAfterSection.match(nextSectionPattern);

  let sectionContent: string;

  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    console.log(`✅ Found next section at index ${nextSectionMatch.index}: "${nextSectionMatch[0].trim()}"`);
    sectionContent = contentAfterSection.substring(0, nextSectionMatch.index).trim();
  } else {
    console.log(`⚠️ No next section found, taking rest of document`);
    sectionContent = contentAfterSection.trim();
  }

  console.log(`\n📊 Extracted ${sectionContent.length} chars from ${fullText.length} total\n`);

  return sectionContent;
}

async function testSectionFiltering() {
  console.log('\n========== FETCHING WIKIPEDIA PAGE ==========\n');

  const pageTitle = 'Order_of_the_Phoenix_(fictional_organisation)';
  console.log(`Fetching: ${pageTitle}...\n`);

  const fullText = await fetchWikipediaPlainText(pageTitle);
  console.log(`✅ Fetched ${fullText.length} characters\n`);

  // Show first 500 chars to see structure
  console.log('--- First 500 characters of full text ---');
  console.log(fullText.substring(0, 500));
  console.log('...\n');

  // Find all section headers in the text
  console.log('--- Finding all section headers ---');
  const headerPattern = /^(===*|==)\s*(.+?)\s*(===*|==)\s*$/gm;
  let match;
  const headers: string[] = [];
  while ((match = headerPattern.exec(fullText)) !== null) {
    headers.push(match[2]);
  }
  console.log(`Found ${headers.length} section headers:`, headers.slice(0, 10), '\n');

  // Test extracting "James Potter" section
  console.log('\n========== TEST: Extract "James Potter" section ==========\n');

  const jamesSection = filterToSection(fullText, 'James Potter');

  console.log('--- Extracted Content (first 500 chars) ---');
  console.log(jamesSection.substring(0, 500));
  console.log('...\n');

  // Check what it contains
  console.log('--- Content Analysis ---');
  console.log(`Contains "Lily Potter" section header: ${jamesSection.includes('=== Lily Potter ===')}`);
  console.log(`Contains "Lily Potter" text: ${jamesSection.includes('Lily Potter')}`);
  console.log(`Contains "Sirius Black" section header: ${jamesSection.includes('=== Sirius Black ===')}`);
  console.log(`Contains "Sirius Black" text: ${jamesSection.includes('Sirius Black')} (OK if mentioned as friend)`);

  // Show where Lily Potter appears if it does
  if (jamesSection.includes('Lily Potter')) {
    const lilyIndex = jamesSection.indexOf('Lily Potter');
    console.log(`\n"Lily Potter" found at char ${lilyIndex}:`);
    console.log(`Context: ...${jamesSection.substring(Math.max(0, lilyIndex - 100), lilyIndex + 100)}...`);
  }

  if (jamesSection.includes('=== Lily Potter ===')) {
    console.log('\n🚨 ERROR: Next section header was included! Section filtering failed.');
  } else {
    console.log('\n✅ SUCCESS: Next section header NOT included. Section filtering works!');
  }
}

testSectionFiltering().catch(console.error);
