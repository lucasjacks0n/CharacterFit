/**
 * Wikipedia content fetcher for character context
 */

interface WikipediaResponse {
  success: boolean;
  title?: string;
  summary?: string;
  url?: string;
  error?: string;
}

/**
 * Extract Wikipedia page title and section from URL
 */
function extractPageInfo(input: string): { title: string; section: string | null } | null {
  // Already a title (no URL)
  if (!input.includes('wikipedia.org') && !input.includes('/')) {
    return { title: input.trim(), section: null };
  }

  // Extract page title and section anchor from URL
  const patterns = [
    /wikipedia\.org\/wiki\/([^#?]+)(?:#(.+))?/i,
    /\/wiki\/([^#?]+)(?:#(.+))?/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const title = decodeURIComponent(match[1].replace(/_/g, ' '));
      const section = match[2] ? decodeURIComponent(match[2].replace(/_/g, ' ')) : null;
      return { title, section };
    }
  }

  return null;
}

/**
 * Filter content to a specific section if section name provided
 */
function filterToSection(fullText: string, sectionName: string): string {
  // Wikipedia plain text API preserves section headers like:
  // === Section Name ===
  // == Section Name ==

  // Normalize section name for matching (remove underscores, handle spaces)
  const normalizedSectionName = sectionName.replace(/_/g, ' ').trim();
  const escapedName = normalizedSectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match section headers with flexible spacing
  // Pattern: one or more = signs, optional spaces, section name, optional spaces, one or more = signs
  const sectionHeaderPattern = new RegExp(
    `^(={2,})\\s*${escapedName}\\s*\\1\\s*$`,
    'im'
  );

  const match = fullText.match(sectionHeaderPattern);

  if (!match) {
    // Section not found, return full text
    console.warn(`Section "${sectionName}" not found in Wikipedia content, returning full article`);
    return fullText;
  }

  console.log(`Found section: "${match[0].trim()}" at position ${match.index}`);

  // Get the content starting from after the section header
  const sectionStartIndex = match.index! + match[0].length;
  const contentAfterSection = fullText.substring(sectionStartIndex);

  // Find the next section header at the SAME or HIGHER level
  // === is level 3, == is level 2
  // We want to stop at the next section of same or higher level
  const sectionLevel = match[1].length; // Number of = signs
  const nextSectionPattern = new RegExp(`^={2,${sectionLevel}}\\s*.+?\\s*={2,${sectionLevel}}\\s*$`, 'm');
  const nextSectionMatch = contentAfterSection.match(nextSectionPattern);

  let sectionContent: string;

  if (nextSectionMatch && nextSectionMatch.index !== undefined) {
    // Extract only until the next section
    sectionContent = contentAfterSection.substring(0, nextSectionMatch.index).trim();
    console.log(`Next section found at ${nextSectionMatch.index}: "${nextSectionMatch[0].trim()}"`);
  } else {
    // No next section found, take everything until the end
    sectionContent = contentAfterSection.trim();
    console.log(`No next section found, taking rest of content`);
  }

  console.log(`Extracted section "${sectionName}": ${sectionContent.length} chars from ${fullText.length} total`);

  return sectionContent;
}

/**
 * Extract intro + early content (before first major section)
 * Provides more context than summary but less than full article
 */
function extractIntroSections(fullText: string): string {
  // Find the first major section header (== Section ==)
  // This typically comes after intro paragraphs and early content
  const majorSectionPattern = /^==\s+.+?\s+==\s*$/m;
  const match = fullText.match(majorSectionPattern);

  if (match && match.index !== undefined) {
    // Return everything before the first major section
    return fullText.substring(0, match.index).trim();
  }

  // No major sections found, return full text
  return fullText;
}

/**
 * Fetch Wikipedia content using appropriate API
 * - For full articles: fetches article and returns intro + early sections
 * - For sections: fetches full article and extracts specific section
 */
export async function fetchWikipediaSummary(
  urlOrTitle: string
): Promise<WikipediaResponse> {
  try {
    const pageInfo = extractPageInfo(urlOrTitle);

    if (!pageInfo) {
      return {
        success: false,
        error: 'Invalid Wikipedia URL or title',
      };
    }

    const { title: pageTitle, section: sectionName } = pageInfo;

    // Fetch full article with section headers preserved
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=wiki&titles=${encodeURIComponent(pageTitle)}&origin=*`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CharacterFits/1.0 (https://characterfits.com; contact@characterfits.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract page content from response
    const pages = data.query?.pages;
    if (!pages) {
      return {
        success: false,
        error: 'Invalid Wikipedia API response',
      };
    }

    // Get the first (and only) page
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    // Check if page exists (missing pages have pageId of -1)
    if (pageId === '-1' || page.missing !== undefined) {
      return {
        success: false,
        error: 'Wikipedia page not found',
      };
    }

    // Get the extract (full text content)
    let fullText = page.extract || '';

    if (!fullText) {
      return {
        success: false,
        error: 'No content available for this page',
      };
    }

    // If section specified, extract that section
    // Otherwise, extract intro + early sections (before first major section)
    let content: string;
    let title: string;
    let url: string;

    if (sectionName) {
      content = filterToSection(fullText, sectionName);
      title = `${page.title} - ${sectionName}`;
      url = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}#${encodeURIComponent(sectionName)}`;
    } else {
      content = extractIntroSections(fullText);
      title = page.title || pageTitle;
      url = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    }

    return {
      success: true,
      title,
      summary: content,
      url,
    };
  } catch (error) {
    console.error('Error fetching Wikipedia content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Wikipedia content',
    };
  }
}

/**
 * Clean Wikipedia content - removes citations and extra whitespace
 * NO LENGTH LIMIT - returns full article content for rich AI context
 */
export function cleanWikipediaSummary(summary: string, maxLength?: number): string {
  // Remove citation markers like [1], [2], etc.
  let cleaned = summary.replace(/\[\d+\]/g, '');

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Only truncate if maxLength is explicitly provided
  if (maxLength && cleaned.length > maxLength) {
    const truncated = cleaned.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.7) {
      // If we have a sentence ending reasonably close, use it
      cleaned = truncated.substring(0, lastPeriod + 1);
    } else {
      // Otherwise just truncate and add ellipsis
      cleaned = truncated.trim() + '...';
    }
  }

  return cleaned;
}
