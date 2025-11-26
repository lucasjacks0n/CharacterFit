/**
 * Prompt builder for generating outfit content sections
 */

interface PromptVariables {
  outfit_name?: string;
  facts?: string;
  list_of_costume_items?: string;
  moondream_description?: string;
  [key: string]: string | undefined;
}

interface SectionPromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[]; // Required variables for this prompt
}

/**
 * Replace template variables in a prompt string
 */
function replaceVariables(template: string, variables: PromptVariables): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      // Replace {{variable}} and {variable} formats
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }

  return result;
}

/**
 * Main Description Section - Short overview (3-6 sentences)
 */
export const mainDescriptionPrompt: SectionPromptConfig = {
  systemPrompt: `You are an expert costume copywriter. Your job is to write vivid, accurate, SEO-optimized descriptions.

Tone:
- Vivid, confident, modern
- Cinematic but grounded
- Conversational without filler
- No personal references or opinions
- Avoid hype clichés ("adrenaline rush," "get the look," etc.)
- Allow second-person only when setting an overall vibe naturally

SEO & Style Goals:
- Provide real value and visual clarity
- Highlight the character's cultural significance
- Describe visual identity beyond just listing items
- Prioritize natural keywords around appearance, persona, and outfit

CRITICAL RULE:
- Use ONLY the information provided in the "Facts" and "Visual Elements" sections
- Do NOT invent new story details, abilities, plot points, or history
- Stay accurate to the input`,

  userPromptTemplate: `Write a main costume description for {outfit_name}.

Output: 3-6 sentences total.

Structure:
- Begin with a concise character overview: who they are and why they're iconic (based on Facts)
- Describe the character's visual identity and how it reflects their persona
- Integrate the Visual Elements into a natural, flowing description of the outfit
- Capture the mood, presence, or essence the costume conveys
- End with a sentence that reinforces the character's distinctive energy

Facts:
{{facts}}

Visual Elements:
{{list_of_costume_items}}

Visual Description:
{{moondream_description}}`,

  variables: ['outfit_name', 'facts', 'list_of_costume_items', 'moondream_description']
};

/**
 * About Character Section - Background and why they're iconic
 */
export const aboutCharacterPrompt: SectionPromptConfig = {
  systemPrompt: `You are an expert writer creating character background sections for a costume website.

Write factually accurate content based ONLY on the provided Wikipedia context. Do not invent or embellish.

Tone:
- Informative and engaging
- Professional but accessible
- Focus on what makes the character culturally significant

SEO Goals:
- Include character name frequently but naturally
- Mention media source (movie, TV show, etc.)
- Include relevant keywords (actor name, franchise, year, etc.)`,

  userPromptTemplate: `Write an "About {outfit_name}" section as a single paragraph (4-6 sentences).

Structure:
- Who the character is and their role
- Why they're iconic or culturally significant
- Key personality traits or defining moments
- Connection to their visual style

Wikipedia Context:
{{facts}}`,

  variables: ['outfit_name', 'facts']
};

/**
 * Fast Facts Section - Bullet points of key info
 */
export const fastFactsPrompt: SectionPromptConfig = {
  systemPrompt: `You are creating a "Fast Facts" section with key character information.

Output format: Return a JSON array of fact objects.

Each fact should be:
- Concise (5-10 words)
- Factually accurate
- Relevant to the costume/character

Example output:
[
  {"label": "First Appearance", "value": "Star Wars (1977)"},
  {"label": "Portrayed By", "value": "Mark Hamill"},
  {"label": "Signature Colors", "value": "Black and white"}
]`,

  userPromptTemplate: `Generate 5-8 fast facts about {outfit_name}.

Facts to include (if available):
- First appearance (movie, show, year)
- Actor/voice actor
- Character role (hero, villain, etc.)
- Signature colors or style elements
- Notable quotes or catchphrases
- Costume designer (if known)

Wikipedia Context:
{{facts}}

Visual Elements:
{{list_of_costume_items}}`,

  variables: ['outfit_name', 'facts', 'list_of_costume_items']
};

/**
 * Build a complete prompt with system and user messages
 */
export function buildPrompt(
  config: SectionPromptConfig,
  variables: PromptVariables
): { system: string; user: string } {
  // Validate required variables are present
  const missingVars = config.variables.filter(v => !variables[v]);
  if (missingVars.length > 0) {
    console.warn(`Missing required variables for prompt: ${missingVars.join(', ')}`);
  }

  return {
    system: config.systemPrompt,
    user: replaceVariables(config.userPromptTemplate, variables)
  };
}

/**
 * Combined prompt that generates all sections in one API call
 */
export const combinedContentPrompt: SectionPromptConfig = {
  systemPrompt: `You are an expert costume copywriter and character analyst. You will generate three distinct content sections in a single JSON response.

Your expertise spans:
1. Vivid, SEO-optimized costume descriptions
2. Factually accurate character backgrounds
3. Extracting key character facts

Tone Guidelines:
- Vivid and cinematic for descriptions
- Informative and engaging for character backgrounds
- Concise and factual for fast facts
- Use ONLY the provided context - do not invent details

CRITICAL OUTPUT REQUIREMENT:
You must return ONLY valid JSON (no markdown, no code blocks, no explanations) with this exact structure:
{
  "mainDescription": "string - 3-6 sentences",
  "aboutCharacter": "string - single paragraph, 4-6 sentences",
  "fastFacts": [
    {"label": "string", "value": "string"},
    {"label": "string", "value": "string"}
  ]
}`,

  userPromptTemplate: `Generate all content sections for {outfit_name}.

=== CONTEXT ===
Character/Outfit: {outfit_name}

Wikipedia Information:
{{facts}}

Costume Elements:
{{list_of_costume_items}}

Visual Description:
{{moondream_description}}

=== SECTION REQUIREMENTS ===

1. MAIN DESCRIPTION (mainDescription - 3-6 sentences):
   - Begin with concise character overview based on the facts
   - Describe the character's visual identity and how it reflects their persona
   - Integrate the costume elements into a natural, flowing description
   - Capture the mood, presence, or essence the costume conveys
   - End with a sentence that reinforces the character's distinctive energy

2. ABOUT CHARACTER (aboutCharacter - single paragraph, 4-6 sentences):
   - Who the character is and their role
   - Why they're iconic or culturally significant
   - Key personality traits or defining moments
   - Connection to their visual style
   - Include character name, media source, actor if available

3. FAST FACTS (fastFacts - array of 5-8 fact objects):
   Include relevant facts such as:
   - First appearance (movie, show, year)
   - Actor/voice actor
   - Character role (hero, villain, etc.)
   - Signature colors or style elements
   - Notable quotes or catchphrases
   - Costume designer (if known)

   Each fact must have a "label" and "value" property.

Return ONLY the JSON object. No additional text or formatting.`,

  variables: ['outfit_name', 'facts', 'list_of_costume_items', 'moondream_description']
};

/**
 * Helper to call DeepSeek with a built prompt
 */
export async function generateSection(
  config: SectionPromptConfig,
  variables: PromptVariables,
  callDeepSeek: (messages: Array<{role: string; content: string}>, temperature?: number) => Promise<string>,
  temperature: number = 0.7
): Promise<string> {
  const { system, user } = buildPrompt(config, variables);

  return callDeepSeek(
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature
  );
}

/**
 * Generate all content sections in a single API call
 */
export async function generateAllSections(
  variables: PromptVariables,
  callDeepSeek: (messages: Array<{role: "system" | "user" | "assistant"; content: string}>, temperature?: number) => Promise<string>,
  temperature: number = 0.7
): Promise<{
  mainDescription: string;
  aboutCharacter: string;
  fastFacts: Array<{label: string; value: string}>;
}> {
  const { system, user } = buildPrompt(combinedContentPrompt, variables);

  const response = await callDeepSeek(
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature
  );

  // Parse the JSON response
  try {
    const parsed = JSON.parse(response);

    // Validate the structure
    if (!parsed.mainDescription || !parsed.aboutCharacter || !Array.isArray(parsed.fastFacts)) {
      throw new Error('Invalid response structure');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse combined prompt response:', error);
    console.error('Raw response:', response);
    throw new Error('Failed to generate content sections: invalid JSON response');
  }
}
