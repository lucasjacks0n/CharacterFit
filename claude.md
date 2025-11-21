# Claude Development Guidelines

## Database & Security Best Practices

### Use UUIDs for Public-Facing IDs

**IMPORTANT:** Always use UUIDs (Universally Unique Identifiers) when storing and exposing data, especially in URLs and APIs. Never expose sequential integer IDs to users.

#### Why UUIDs?

1. **Security**: Sequential IDs leak information about database size, growth rate, and allow enumeration attacks
2. **Privacy**: Prevents users from guessing valid IDs and accessing other records
3. **Scalability**: UUIDs are globally unique and work well in distributed systems
4. **Predictability**: Integer IDs are predictable; UUIDs are not

#### Examples of What NOT to Do:

```typescript
// ❌ BAD - Exposes sequential integer ID
<Link href={`/outfits/${outfit.id}`}>View Outfit</Link>
// URL: /outfits/123 (easy to enumerate: /outfits/1, /outfits/2, etc.)

// ❌ BAD - API returns sequential IDs
{ id: 1, name: "Outfit" }
```

#### Examples of What TO Do:

```typescript
// ✅ GOOD - Uses UUID
<Link href={`/outfits/${outfit.uuid}`}>View Outfit</Link>
// URL: /outfits/a3f2e8d9-4c7b-4a1f-9e3d-8f2c1a4b5e6c

// ✅ GOOD - Database schema with UUID
export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(), // Internal use only
  uuid: uuid("uuid").defaultRandom().notNull().unique(), // Public-facing
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});

// ✅ GOOD - API returns UUIDs
{ uuid: "a3f2e8d9-4c7b-4a1f-9e3d-8f2c1a4b5e6c", name: "Outfit" }
```

#### Implementation Checklist:

- [ ] Add UUID columns to all tables that need public-facing IDs
- [ ] Use UUIDs in all URLs (`/outfits/[uuid]` not `/outfits/[id]`)
- [ ] Use UUIDs in all API responses
- [ ] Keep integer IDs for internal use only (foreign keys, database operations)
- [ ] Never expose sequential IDs in error messages or logs
- [ ] Use `.defaultRandom()` in Drizzle schema for automatic UUID generation

#### Migration Strategy:

When adding UUIDs to existing tables:
1. Add a `uuid` column with `.defaultRandom().notNull().unique()`
2. Run a migration to populate UUIDs for existing records
3. Update all routes to use UUID instead of ID
4. Update all API endpoints to accept/return UUIDs
5. Update frontend to use UUIDs for navigation and API calls

---

## Frontend Best Practices

### Form Input Styling

**IMPORTANT:** Always ensure form inputs have proper text color styling for visibility and accessibility.

#### Required Input Styles:

All text inputs, textareas, and select elements MUST include:
- `text-gray-900` - Makes the input text dark and visible
- `placeholder:text-gray-400` - Makes placeholder text lighter but still readable

#### Examples of What NOT to Do:

```typescript
// ❌ BAD - No text color specified, text may be invisible
<input
  type="text"
  className="px-4 py-2 border border-gray-300 rounded-lg"
/>

// ❌ BAD - Placeholder not styled
<input
  type="text"
  placeholder="Search..."
  className="px-4 py-2 border text-gray-900"
/>
```

#### Examples of What TO Do:

```typescript
// ✅ GOOD - Text and placeholder properly styled
<input
  type="text"
  placeholder="Search for outfits..."
  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400"
/>

// ✅ GOOD - Textarea with proper styling
<textarea
  placeholder="Enter description..."
  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400"
/>

// ✅ GOOD - Select with proper styling
<select className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
  <option>Choose an option</option>
</select>
```

#### Standard Input Class Pattern:

Use this base pattern for all form inputs:
```
className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
```

---

## API Security Best Practices

### Limit Parameter Validation

**IMPORTANT:** Always validate and cap limit parameters to prevent data scraping and database overload.

#### Required Implementation:

All API endpoints that accept a `limit` parameter MUST:
- Define a reasonable `MAX_LIMIT` (e.g., 50-100)
- Validate the limit is between 1 and MAX_LIMIT
- Reject or cap requests that exceed the limit

#### Examples of What NOT to Do:

```typescript
// ❌ BAD - No limit validation, allows unlimited scraping
const limit = parseInt(searchParams.get("limit") || "20");
const results = await db.select().from(outfits).limit(limit);

// ❌ BAD - Trusts user input directly
const limit = parseInt(searchParams.get("limit") || "20");
```

#### Examples of What TO Do:

```typescript
// ✅ GOOD - Proper limit validation
const requestedLimit = parseInt(searchParams.get("limit") || "20");
const MAX_LIMIT = 50;
const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

// ✅ GOOD - With validation error
if (requestedLimit > MAX_LIMIT) {
  return NextResponse.json(
    { error: `Limit cannot exceed ${MAX_LIMIT}` },
    { status: 400 }
  );
}
const limit = Math.max(requestedLimit, 1);
```

#### Security Considerations:

- **Prevent scraping**: Limits stop users from extracting entire datasets
- **Prevent DoS**: Large queries can overload the database
- **Rate limiting**: Consider adding rate limits for sensitive endpoints
- **Authentication**: Consider requiring auth for search/list endpoints

---

## Additional Guidelines

(Add other development guidelines here as needed)

Whenever you run a psql command you have to use the .env database url, "$DATABASE_URL" will never be available if not