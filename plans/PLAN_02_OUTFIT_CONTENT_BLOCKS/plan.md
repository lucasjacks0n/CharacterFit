One description column is not going to cut it for seo / page structure. We need something like the following:

# Content pieces
These are just suggestions, maybe not have all of them. (*) means important

1. Main Description *

A concise overview of the outfit and its overall vibe.
4-6 sentences summarizing what makes the look recognizable and how the core pieces work together.

2. About the Character *

Background context about who the character is, their personality, key scenes, and why their style is iconic.
This section establishes relevance and taps into character-related search queries.

3. Key Outfit Pieces

A structured, scannable list of the essential clothing items and accessories.
Each bullet should include the item name + a brief explanation of its role in the look.

4. How to Wear This Today (Styling Tips) *

Modern, practical fashion advice on how to adapt the outfit for everyday wear.
This helps the page rank for broader fashion queries, not just costume-specific queries.

5. Fast Facts *

Short factual bullets that reinforce context and help with SEO snippets.
Examples: first appearance, actor name, typical color palette, character traits, notable quotes.

6. Alternate Versions of the Look

If applicable, list different variations of the outfit across seasons, episodes, or eras.
Each variation can be described in 1–2 sentences.

7. Behind-the-Scenes Notes

Trivia about the costume design, inspiration, materials used, or production choices.
Useful for ranking on deeper informational search queries.

8. Why This Look Works

A brief explanation of the aesthetic appeal or themes represented in the outfit.
This section helps satisfy broader intent and increases content depth.

9. Related Outfits *

Suggest similar characters or styles.
Ideal for internal linking and topical authority.

# Phases

## Part 1
Break up content into individual pieces for seo
- Scrape wikipedia for content to be more accurate and deliver facts
- let's store this in it's own database table when we scrape it so we don't have to keep scraping it in the future
- have something like outfit_sections table, this would be the most flexible
  outfit_sections (
    id           uuid primary key,
    outfit_id    uuid not null references outfits(id) on delete cascade,
    section_type text not null,      -- e.g. "costume_guide", "about_character", "key_pieces"
    sort_order   int  not null,      -- controls display order
    heading      text,               -- optional: "About the Character", "Fast Facts", etc.
    content_md   text not null,      -- markdown / rich text
    meta_json    jsonb               -- optional: structured data (lists, facts, etc.)
  )
- Start with main description, about the character, fast facts



### Notes:
Come up with efficient ways of generating this content
Maybe we roll out sections in phases? 
Need content generation scripts
Store scraped wiki pages, handle non wiki sources, or input text data (for getting information via chatgpt) 
Have deepseek use facts to generate the content for outfit sections
Could also be useful to come up with image descriptions from moondream *