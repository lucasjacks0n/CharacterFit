/**
 * Tests for Wikipedia scraper section filtering
 */

// Sample Wikipedia plain text format (from explaintext API)
const sampleWikipediaText = `Order of the Phoenix is a fictional organization in Harry Potter.


== Members ==


=== James Potter ===

James Potter (27 March 1960 – 31 October 1981), also known as Prongs, is Harry Potter's father. He attended Hogwarts School of Witchcraft and Wizardry from 1971 to 1978 and was Sorted into Gryffindor house. When James started at Hogwarts, he met and became best friends with three fellow Gryffindor students: Remus Lupin, Sirius Black, and Peter Pettigrew. He also met Severus Snape, a Slytherin student with whom he became rivals. During his seventh year, James was appointed Head Boy and began dating Lily Evans.

After graduating from Hogwarts, he married Lily and they had a son, Harry James Potter. James and Lily were members of the original Order of the Phoenix. When Voldemort targeted the Potters, they went into hiding and used the Fidelius Charm. Their friend Peter Pettigrew betrayed them, and James was murdered by Lord Voldemort on 31 October 1981.


=== Lily Potter ===

Lily J. Potter (née Evans) (30 January 1960 – 31 October 1981) is the mother of Harry Potter. She learned of her magical nature as a child, after Severus Snape recognized her as a witch and told her of the existence of magic. The two became close friends, but their friendship became strained over the years due to Snape's irrepressible interest in the Dark Arts.

Lily attended Hogwarts School of Witchcraft and Wizardry from 1971 to 1978. She was Sorted into Gryffindor House and was a member of the Slug Club. During her seventh year she was appointed Head Girl. After leaving school, Lily married James Potter. The couple joined the Order of the Phoenix during the First Wizarding War.


=== Sirius Black ===

Sirius Black III (3 November 1959 – 18 June 1996) is a pure-blood wizard and Harry's godfather.`;

/**
 * Test function to extract a section from Wikipedia text
 */
function filterToSection(fullText: string, sectionName: string): string {
  const normalizedSectionName = sectionName.replace(/_/g, ' ').trim();
  const escapedName = normalizedSectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Try to find the section with various header levels
  const sectionHeaderPattern = new RegExp(
    `^(===*|==)\\s*${escapedName}\\s*(===*|==)\\s*$`,
    'im'
  );

  const match = fullText.match(sectionHeaderPattern);

  if (!match) {
    console.warn(`Section "${sectionName}" not found`);
    return fullText;
  }

  console.log(`Found section header: "${match[0]}"`);

  // Get the content starting from after the section header
  const sectionStartIndex = match.index! + match[0].length;
  const contentAfterSection = fullText.substring(sectionStartIndex);

  console.log(`Content after section starts at index ${sectionStartIndex}`);
  console.log(`First 100 chars of content after section: "${contentAfterSection.substring(0, 100)}"`);

  // Find the next section header (any level: ==, ===, etc.)
  const nextSectionPattern = /^(===*|==)\s*.+?\s*(===*|==)\s*$/m;
  const nextSectionMatch = contentAfterSection.match(nextSectionPattern);

  if (nextSectionMatch) {
    console.log(`Found next section header at index ${nextSectionMatch.index}: "${nextSectionMatch[0]}"`);
  } else {
    console.log(`No next section found`);
  }

  let sectionContent: string;

  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    // Extract only until the next section
    sectionContent = contentAfterSection.substring(0, nextSectionMatch.index).trim();
  } else {
    // No next section found, take everything until the end
    sectionContent = contentAfterSection.trim();
  }

  console.log(`\nExtracted section "${sectionName}":`);
  console.log(`Length: ${sectionContent.length} characters (from ${fullText.length} total)`);
  console.log(`Content:\n${sectionContent}`);

  return sectionContent;
}

// Run tests
console.log('\n========== TEST 1: Extract "James Potter" section ==========\n');
const jamesSection = filterToSection(sampleWikipediaText, 'James Potter');
console.log('\n--- Should NOT contain "Lily Potter" or "Sirius Black" ---');
console.log('Contains "Lily Potter":', jamesSection.includes('Lily Potter'));
console.log('Contains "Sirius Black":', jamesSection.includes('Sirius Black'));

console.log('\n\n========== TEST 2: Extract "Lily Potter" section ==========\n');
const lilySection = filterToSection(sampleWikipediaText, 'Lily Potter');
console.log('\n--- Should NOT contain "Sirius Black" ---');
console.log('Contains "Sirius Black":', lilySection.includes('Sirius Black'));

console.log('\n\n========== TEST 3: Try non-existent section ==========\n');
filterToSection(sampleWikipediaText, 'Hermione Granger');
