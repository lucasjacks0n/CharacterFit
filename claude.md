# Claude Development Guidelines

## Database & Security Best Practices

### CRITICAL: Never Expose Sequential IDs to Users

**MANDATORY RULE:** Outfit IDs must NEVER be exposed to users in any client-facing code, URLs, or APIs. Always use slugs for public-facing identifiers.

#### Why This Matters:

1. **Security**: Sequential IDs reveal database size and allow enumeration attacks
2. **Privacy**: Users can guess valid IDs and access other records
3. **SEO**: Slugs are descriptive and improve search rankings
4. **Unpredictability**: AI-generated slugs prevent scraping

#### Implementation Rules:

**Client-Side (Public):**
- ✅ ALWAYS use `slug` for URLs: `/outfits/casual-summer-beach-outfit`
- ✅ ALWAYS use `slug` in API responses to users
- ✅ ALWAYS use `slug` in links and navigation
- ❌ NEVER expose `id` in any client-facing code
- ❌ NEVER use `id` in React keys (use `slug` instead)

**Server-Side (Admin Only):**
- ✅ Use `id` for internal database operations
- ✅ Use `id` in admin interfaces only
- ✅ Use `id` for foreign keys and joins
- ⚠️ Never send `id` to client unless in admin context

#### Code Examples:

```typescript
// ❌ BAD - Exposes ID to client
interface OutfitCardProps {
  outfit: {
    id: number;  // NEVER expose this
    name: string;
  };
}
<Link href={`/outfits/${outfit.id}`}>  // WRONG

// ✅ GOOD - Only uses slug
interface OutfitCardProps {
  outfit: {
    slug: string;  // Always use this
    name: string;
  };
}
<Link href={`/outfits/${outfit.slug}`}>  // CORRECT

// ❌ BAD - Returns ID in API
SELECT id, name FROM outfits WHERE status = 1

// ✅ GOOD - Returns slug only
SELECT slug, name FROM outfits WHERE status = 1 AND slug IS NOT NULL

// ✅ GOOD - Internal use only (not sent to client)
const [outfit] = await db.select({
  id: outfits.id,  // Used only for joins
  slug: outfits.slug,
  name: outfits.name,
}).from(outfits).where(eq(outfits.slug, slug));

// Then filter out ID before sending to client
return { slug: outfit.slug, name: outfit.name };
```

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

## Database Migration Best Practices

### Always Use npm Scripts for Database Operations

**CRITICAL:** NEVER run database commands directly. ALWAYS use the npm scripts defined in package.json.

#### Required Commands:

- **Database push**: `npm run db:push` (NOT `npx drizzle-kit push` or `psql` commands)
- **Generate migration**: `npx drizzle-kit generate` (this is read-only, safe to use)
- **Database studio**: `npm run db:studio` (if available)

#### Why Use npm Scripts?

1. **Consistent configuration**: npm scripts use the correct environment variables and settings
2. **Team alignment**: Everyone uses the same commands with the same flags
3. **Error prevention**: Avoids SSL mode issues, connection string problems, and other configuration errors
4. **Automation-ready**: Scripts can be updated without changing code/documentation

#### Examples of What NOT to Do:

```bash
# ❌ BAD - Direct drizzle-kit commands bypass npm configuration
npx drizzle-kit push

# ❌ BAD - Direct psql commands can have SSL/connection issues
psql "$DATABASE_URL" -c "ALTER TABLE..."

# ❌ BAD - Manually sourcing .env and running commands
source .env && npx drizzle-kit push
```

#### Examples of What TO Do:

```bash
# ✅ GOOD - Use npm script
npm run db:push

# ✅ GOOD - Generate migration (read-only operation)
npx drizzle-kit generate

# ✅ GOOD - Check package.json for available scripts
npm run
```

---

## AI Generation Security

### CRITICAL: Protect AI Generation Endpoints Behind Admin Authentication

**MANDATORY RULE:** Any AI generation endpoints or features that can be abused (high API costs, rate limiting concerns, resource-intensive operations) MUST be protected behind admin authentication.

#### Why This Matters:

1. **Cost Control**: AI API calls (DeepSeek, OpenAI, etc.) cost money and can be expensive at scale
2. **Abuse Prevention**: Public endpoints can be scraped, spammed, or used to drain resources
3. **Quality Control**: Admin-only access ensures generated content is reviewed before going live
4. **Rate Limiting**: Prevents hitting API rate limits from malicious or excessive use

#### Implementation Rules:

**AI Generation Features That MUST Be Admin-Only:**
- ✅ Description generation with AI
- ✅ Slug generation with AI
- ✅ Image generation or manipulation
- ✅ Bulk content generation
- ✅ Any feature using external AI APIs (DeepSeek, OpenAI, etc.)
- ✅ Content summarization or rewriting
- ✅ Automated SEO content generation

**How to Protect Endpoints:**

**✅ PREFERRED METHOD - Use src/proxy.ts (DRY)**

Admin authentication is handled centrally in `src/proxy.ts` for ALL `/api/admin/*` and `/admin/*` routes. No need to add auth checks in individual route files.

```typescript
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      // For API routes, return 403 JSON
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Check if user has admin role in metadata
    if (sessionClaims?.metadata?.role !== "admin") {
      // For API routes, return 403 JSON
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});
```

**Route Implementation:**

```typescript
// ✅ GOOD - Admin routes under /api/admin/* are automatically protected by src/proxy.ts
// src/app/api/admin/generate-description/route.ts
export async function POST(request: NextRequest) {
  // NOTE: Admin auth is handled by src/proxy.ts for /api/admin/* routes
  const body = await request.json();
  const result = await generateWithAI(body.prompt);
  return NextResponse.json({ result });
}

// ❌ BAD - No authentication, anyone can use AI generation
// src/app/api/generate-description/route.ts (NOT under /api/admin/)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await generateWithAI(body.prompt); // Publicly accessible!
  return NextResponse.json({ result });
}
```

**IMPORTANT:** All admin authentication is handled in `src/proxy.ts`. Never create `src/middleware.ts` - we use `proxy.ts` for auth middleware.

**Frontend Implementation:**

```typescript
// ✅ GOOD - Only show AI generation UI in admin pages
// File: src/app/admin/outfits/edit/[id]/page.tsx
const handleGenerateDescription = async () => {
  const response = await fetch("/api/admin/generate-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outfitName, wikipediaUrl }),
  });
  // Handle response...
};

// ❌ BAD - AI generation available on public pages
// File: src/app/outfits/[slug]/page.tsx
// NEVER put AI generation on public-facing pages
```

#### API Endpoint Naming Convention:

- Admin-protected AI endpoints should be under `/api/admin/*` path
- Examples:
  - ✅ `/api/admin/generate-description`
  - ✅ `/api/admin/generate-slug`
  - ✅ `/api/admin/bulk-generate`
  - ❌ `/api/generate-description` (NOT admin-protected)

#### Additional Security Measures:

1. **Rate Limiting**: Consider adding rate limiting even for admin endpoints
2. **Logging**: Log all AI generation requests for audit trails
3. **Cost Monitoring**: Monitor AI API usage and set up alerts
4. **Fallback Handling**: Always have fallback logic if AI generation fails
5. **Input Validation**: Validate all inputs before sending to AI APIs

#### Example Implementation:

```typescript
// src/app/api/admin/generate-description/route.ts
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Admin authentication check
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { outfitName, wikipediaUrl, occasion, season } = body;

    // Input validation
    if (!outfitName || !outfitName.trim()) {
      return NextResponse.json(
        { error: "outfitName is required" },
        { status: 400 }
      );
    }

    // AI generation with error handling
    const description = await generateOutfitDescription({
      outfitName: outfitName.trim(),
      wikipediaContext,
      occasion: occasion?.trim(),
      season: season?.trim(),
    });

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
```

---

## Plans

Always write plans to ./plans directory


---

## Additional Guidelines

(Add other development guidelines here as needed)

