/**
 * DeepSeek API integration for AI-powered content generation
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Call DeepSeek API with messages
 */
async function callDeepSeek(
  messages: DeepSeekMessage[],
  temperature: number = 0.7
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not set in environment variables");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Generate a URL-friendly slug from an outfit name and optional description
 * Uses DeepSeek to create SEO-optimized, descriptive slugs
 *
 * @param outfitName - The name of the outfit
 * @param description - Optional description for additional context
 * @returns A URL-friendly slug (e.g., "casual-summer-beach-outfit")
 */
export async function generateSlug(
  outfitName: string,
  description?: string
): Promise<string> {
  // Fallback for empty names
  if (!outfitName || outfitName.trim() === "") {
    return `outfit-${Date.now()}`;
  }

  const systemPrompt = `You are a slug generator for a fashion outfit website. Generate URL-friendly slugs that are:
- 3-5 words maximum
- Lowercase with hyphens separating words
- Descriptive and SEO-friendly
- No special characters except hyphens
- Based on the outfit name and description

Examples:
Input: "Casual Summer Beach Look"
Output: casual-summer-beach-look

Input: "Formal Business Meeting Attire"
Output: formal-business-meeting-attire

Input: "Cozy Winter Evening Outfit"
Output: cozy-winter-evening-outfit

Only respond with the slug itself, nothing else.`;

  const userPrompt = description
    ? `Outfit Name: ${outfitName}\nDescription: ${description}`
    : `Outfit Name: ${outfitName}`;

  try {
    const slug = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      0.3 // Lower temperature for more consistent output
    );

    // Clean and validate the slug
    const cleanedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric (except hyphens) with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Fallback if DeepSeek returned something invalid
    if (!cleanedSlug || cleanedSlug.length < 3) {
      return outfitName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);
    }

    return cleanedSlug.substring(0, 255); // Limit to database column length
  } catch (error) {
    console.error("Error generating slug with DeepSeek:", error);
    // Fallback to simple slug generation
    return outfitName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 100);
  }
}

/**
 * Ensure slug is unique by appending a number if necessary
 *
 * @param baseSlug - The base slug to check
 * @param existingSlugs - Array of slugs that already exist
 * @returns A unique slug
 */
export function ensureUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 2;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
