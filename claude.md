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

## Additional Guidelines

(Add other development guidelines here as needed)
