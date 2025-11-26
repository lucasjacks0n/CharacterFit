/**
 * Test the combined prompt output structure
 */

import {
  buildPrompt,
  combinedContentPrompt,
} from "../src/prompts/outfitContentSections";

// Sample variables
const testVariables = {
  outfit_name: "The Undertaker",
  facts: `Mark William Calaway (born March 24, 1965), better known by his ring name the Undertaker, is an American retired professional wrestler. He is signed to WWE, where he is a brand ambassador. Widely regarded as one of the greatest professional wrestlers of all time, Calaway spent the vast majority of his career wrestling for WWE and in 2022 was inducted into the WWE Hall of Fame. He is known for his gothic, supernatural character and is famous for his WrestleMania winning streak of 21 consecutive victories.`,
  list_of_costume_items:
    "black hat, long black trench coat, black gloves, black boots, wrestling tights",
  moondream_description:
    "A tall, imposing figure dressed entirely in black with a wide-brimmed hat casting shadows over his face",
};

// Build the prompt
const { system, user } = buildPrompt(combinedContentPrompt, testVariables);

console.log("========== COMBINED PROMPT OUTPUT ==========\n");
console.log("=== SYSTEM PROMPT ===\n");
console.log(system);
console.log("\n=== USER PROMPT ===\n");
console.log(user);

console.log("\n=== EXPECTED JSON OUTPUT STRUCTURE ===\n");
console.log(
  JSON.stringify(
    {
      costumeGuide: "3-6 sentences describing the costume...",
      aboutCharacter: "Single paragraph about The Undertaker...",
      fastFacts: [
        { label: "Ring Name", value: "The Undertaker" },
        { label: "Real Name", value: "Mark William Calaway" },
        { label: "Debut", value: "1987" },
        { label: "WWE Hall of Fame", value: "2022" },
        { label: "Signature Colors", value: "Black and purple" },
      ],
    },
    null,
    2
  )
);

console.log("\n=== TOKEN EFFICIENCY ===\n");
console.log(`Combined prompt sends context ONCE for all 3 sections`);
console.log(`Individual prompts would send context 3 TIMES`);
console.log(`Estimated token savings: ~50% reduction`);
