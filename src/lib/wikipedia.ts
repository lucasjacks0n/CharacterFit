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
 * Extract Wikipedia page title from various URL formats
 */
function extractPageTitle(input: string): string | null {
  // Already a title (no URL)
  if (!input.includes('wikipedia.org') && !input.includes('/')) {
    return input.trim();
  }

  // Extract from URL
  const patterns = [
    /wikipedia\.org\/wiki\/([^#?]+)/i,
    /\/wiki\/([^#?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return decodeURIComponent(match[1].replace(/_/g, ' '));
    }
  }

  return null;
}

/**
 * Fetch full Wikipedia page content using Wikipedia API
 * Gets complete article text, not just summary
 */
export async function fetchWikipediaSummary(
  urlOrTitle: string
): Promise<WikipediaResponse> {
  try {
    const pageTitle = extractPageTitle(urlOrTitle);

    if (!pageTitle) {
      return {
        success: false,
        error: 'Invalid Wikipedia URL or title',
      };
    }

    // Use Wikipedia Action API with extracts to get full page content
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=plain&titles=${encodeURIComponent(pageTitle)}&origin=*`;

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
    const fullText = page.extract || '';

    if (!fullText) {
      return {
        success: false,
        error: 'No content available for this page',
      };
    }

    return {
      success: true,
      title: page.title || pageTitle,
      summary: fullText,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
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
