/**
 * SEO content generation using DeepSeek
 */

import { callDeepSeek } from './deepseek';

interface GenerateDescriptionOptions {
  outfitName: string;
  wikipediaContext?: string;
  occasion?: string;
  season?: string;
  clothingItems?: string[];
}

/**
 * Generate SEO-optimized outfit description using DeepSeek
 * Creates long-form, keyword-rich content (800-1500 words)
 */
export async function generateOutfitDescription(
  options: GenerateDescriptionOptions
): Promise<string> {
  const { outfitName, wikipediaContext, occasion, season, clothingItems } = options;

  const systemPrompt = `You are an expert SEO copywriter for a character costume and outfit website. Your goal is to create comprehensive, keyword-rich content that is WELL-ORGANIZED and easy to scan.

Write a detailed, engaging description (800-1500 words) with CLEAR SECTIONS using H3 headers (###).

**REQUIRED STRUCTURE:**

1. **INTRO PARAGRAPH** (2-3 sentences):
   - Brief, engaging introduction about the character/outfit
   - Why it's popular for costumes
   - NO header, just start with compelling text

2. **### About [Character Name]**:
   - Character background and history (use Wikipedia context if provided)
   - Why they're iconic or culturally significant
   - Personality traits, famous quotes, or signature moments
   - 200-300 words

3. **### The Signature Look**:
   - Detailed breakdown of outfit components
   - Reference the specific clothing items provided (colors, styles, key pieces)
   - What makes this outfit instantly recognizable
   - 250-350 words

4. **### How to Style This Outfit**:
   - Step-by-step styling tips
   - What pieces to prioritize
   - Hair, makeup, or accessory suggestions
   - 150-250 words

5. **### Perfect For These Occasions**:
   - When/where to wear this outfit
   - Events: Halloween, cosplay conventions, themed parties, etc.
   - Season considerations if provided
   - 100-150 words

6. **### Shopping & Budget Tips**:
   - Where to find similar pieces
   - Budget alternatives
   - Tips for authenticity vs. cost
   - 100-200 words

**SEO REQUIREMENTS:**
- Use the character name frequently but naturally
- Include keywords: "costume", "outfit", "dress like", "cosplay", "look", "style"
- Mention specific clothing items from the provided list
- Write in helpful, enthusiastic tone
- Be factually accurate based on Wikipedia context
- Natural language - NO keyword stuffing

**FORMATTING:**
- Output as HTML (NOT markdown)
- Use <h3> tags for section headers with class="text-xl font-semibold text-gray-900 mt-6 mb-3"
- Use <p> tags for paragraphs with class="text-gray-700 mb-4"
- Keep paragraphs short (3-4 sentences)
- Professional but conversational tone
- Easy to scan with clear sections

**EXAMPLE HTML OUTPUT:**
<p class="text-gray-700 mb-4">Bret Hart is one of the most iconic wrestlers in WWE history...</p>

<h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">About Bret Hart</h3>
<p class="text-gray-700 mb-4">Known as "The Excellence of Execution," Bret Hart revolutionized professional wrestling...</p>

<h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">The Signature Look</h3>
<p class="text-gray-700 mb-4">The centerpiece of any Bret Hart costume is the iconic pink and black wrestling attire...</p>`;

  let userPrompt = `Character/Outfit: ${outfitName}\n`;

  if (clothingItems && clothingItems.length > 0) {
    userPrompt += `\nClothing Items in This Outfit:\n${clothingItems.join(', ')}\n`;
    userPrompt += `\nIMPORTANT: Reference these specific clothing items naturally throughout the description. Mention them when discussing outfit components and styling tips.\n`;
  }

  if (wikipediaContext) {
    userPrompt += `\nCharacter Background (from Wikipedia):\n${wikipediaContext}\n`;
    userPrompt += `\nUSE THIS INFORMATION: Incorporate factual details from Wikipedia into your description to make it accurate and informative.\n`;
  }

  if (occasion) {
    userPrompt += `\nOccasion: ${occasion}\n`;
    userPrompt += `Mention this occasion prominently in the description.\n`;
  }

  if (season) {
    userPrompt += `\nSeason: ${season}\n`;
    userPrompt += `Discuss seasonal considerations for this outfit.\n`;
  }

  userPrompt += `\nGenerate a comprehensive, SEO-optimized description (800-1500 words):`;

  try {
    const description = await callDeepSeek(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.7 // Higher temperature for more creative, engaging content
    );

    // Clean the output
    let cleaned = description.trim();

    // Remove quotes if DeepSeek wrapped it
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }

    return cleaned;
  } catch (error) {
    console.error('Error generating description with DeepSeek:', error);

    // Fallback to simple description
    const fallback = `Looking to dress like ${outfitName}? This comprehensive costume guide will help you achieve the perfect ${outfitName} look. ${
      wikipediaContext ? wikipediaContext + ' ' : ''
    }Whether you're preparing for ${occasion || 'a costume event, Halloween, or cosplay convention'}, getting the ${outfitName} style right requires attention to detail. ${
      season ? `This ${season} outfit is perfect for seasonal events and parties. ` : ''
    }Browse our curated selection of clothing items and accessories to complete your ${outfitName} costume.`;

    return fallback;
  }
}
