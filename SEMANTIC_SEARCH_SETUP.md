# Semantic Search Setup Guide

This guide explains how to set up and use semantic search with vector embeddings for costume/outfit search.

## Overview

The semantic search system uses:
- **pgvector** extension for PostgreSQL vector similarity search
- **Transformers.js** (@xenova/transformers) for generating embeddings
- **all-MiniLM-L6-v2** model (384 dimensions) - runs locally, no API costs
- Cosine similarity for finding relevant results

## Setup Steps

### 1. Enable pgvector Extension

First, enable the pgvector extension in your PostgreSQL database:

```bash
# Connect to your database and run:
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Or run the SQL script:
psql $DATABASE_URL -f scripts/enable-pgvector.sql
```

### 2. Run Database Migration

Apply the migration to add embedding columns:

```bash
# Option 1: Use Drizzle (recommended when DATABASE_URL is set)
npm run db:push

# Option 2: Run SQL migration directly
psql $DATABASE_URL -f drizzle/0006_add_vector_embeddings.sql
```

This adds:
- `embedding vector(384)` column to `clothing_items` table
- `embedding vector(384)` column to `outfits` table
- Indexes for fast vector similarity search

### 3. Generate Embeddings

Generate embeddings for all existing clothing items and outfits:

```bash
npx tsx scripts/generate-embeddings.ts
```

**First run**: Downloads the model (~80MB), then caches it locally
**Subsequent runs**: Uses cached model, very fast

The script:
- Fetches all items/outfits without embeddings
- Creates rich text representations (title, brand, color, description, etc.)
- Generates 384-dimension vectors using all-MiniLM-L6-v2
- Stores embeddings in the database

**Run this script whenever you add new items!**

### 4. Test the Search API

Try searching:

```bash
# Search everything
curl "http://localhost:3000/api/search?q=red+dress"

# Search only clothing items
curl "http://localhost:3000/api/search?q=wizard+robe&type=items"

# Search only outfits
curl "http://localhost:3000/api/search?q=Halloween+party&type=outfits"

# Limit results
curl "http://localhost:3000/api/search?q=black+leather&limit=10"
```

## API Reference

### GET /api/search

Search for clothing items and outfits using semantic similarity.

**Query Parameters:**
- `q` (required): Search query (e.g., "red dress", "wizard costume")
- `type` (optional): `"items"`, `"outfits"`, or `"all"` (default: `"all"`)
- `limit` (optional): Max results per type (default: `20`)

**Response:**
```json
{
  "query": "red dress",
  "items": [
    {
      "id": 123,
      "title": "Women's Red Cocktail Dress",
      "brand": "Amazon Essentials",
      "category": "dress",
      "color": "red",
      "price": "29.99",
      "imageUrl": "https://...",
      "productUrl": "https://amazon.com/dp/...",
      "similarity": 0.87
    }
  ],
  "outfits": [
    {
      "id": 45,
      "name": "Elegant Evening Look",
      "description": "Perfect for dinner dates",
      "occasion": "formal",
      "season": "all",
      "imageUrl": "https://...",
      "similarity": 0.82
    }
  ]
}
```

**Similarity score**: 0.0 to 1.0 (higher = more similar)

## How It Works

### Embedding Generation

The system creates rich text representations:

**For clothing items:**
```
"Women's Red Cocktail Dress | Brand: Amazon Essentials | Category: dress |
Color: red | Material: Polyester | [description...]"
```

**For outfits:**
```
"Elegant Evening Look | Perfect for dinner dates | Occasion: formal |
Season: all | Items: Red Dress, Black Heels, Silver Clutch"
```

These texts are converted to 384-dimension vectors that capture semantic meaning.

### Search Process

1. User query → Generate embedding
2. Compare query embedding to all item/outfit embeddings using cosine similarity
3. Return top N most similar results

**Example:**
- Query: "wizard costume"
- Matches: "Harry Potter Robe", "Sorcerer Outfit", "Merlin Costume" (even without exact keyword match!)

## Integration Examples

### Auto-generate embeddings after creating items

```typescript
// In your create item API
const [newItem] = await db.insert(clothingItems).values({
  title: "Red Dress",
  // ... other fields
}).returning();

// Generate embedding
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const text = `${newItem.title} | Brand: ${newItem.brand} | ...`;
const output = await embedder(text, { pooling: "mean", normalize: true });
const embedding = Array.from(output.data);

// Update with embedding
await db.update(clothingItems)
  .set({ embedding: JSON.stringify(embedding) })
  .where(eq(clothingItems.id, newItem.id));
```

### Frontend integration

```typescript
// React example
async function searchItems(query: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=items`);
  const data = await res.json();
  return data.items;
}

// Usage
const results = await searchItems("black leather jacket");
```

## Performance

- **Model loading**: ~2-3 seconds (first request only, then cached)
- **Query embedding generation**: ~50-100ms
- **Database search**: <10ms with pgvector indexes
- **Total search latency**: ~60-110ms after initial load

## Maintenance

### Regular embedding regeneration

Set up a cron job to regenerate embeddings periodically:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/characterfits && npx tsx scripts/generate-embeddings.ts
```

Or trigger after bulk imports:

```bash
# After bulk import script
npm run bulk-import
npx tsx scripts/generate-embeddings.ts
```

### Monitoring

Check for items without embeddings:

```sql
SELECT COUNT(*) FROM clothing_items WHERE embedding IS NULL;
SELECT COUNT(*) FROM outfits WHERE embedding IS NULL;
```

## Troubleshooting

### "vector type does not exist"
Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### "Embedding is null" errors
Run: `npx tsx scripts/generate-embeddings.ts`

### Slow first search request
The model loads on first request (~2-3s). Subsequent requests are fast (<100ms).

### Out of memory
Reduce batch size in `generate-embeddings.ts` from 32 to 16 or 8.

## Future Enhancements

- **Image search with CLIP**: Search by uploading reference images
- **Hybrid search**: Combine semantic + keyword search for best results
- **Filters**: Add filters for price, color, category alongside semantic search
- **Reranking**: Use cross-encoder for more accurate top results
- **Personalization**: Learn user preferences over time

## Resources

- [pgvector docs](https://github.com/pgvector/pgvector)
- [Transformers.js docs](https://huggingface.co/docs/transformers.js)
- [all-MiniLM-L6-v2 model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
