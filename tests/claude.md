# Debugging Amazon Scraper - Claude's Approach

## Problem
Amazon scraper wasn't extracting product descriptions and details for certain products.

## Debugging Methodology

### Step 1: Save the Page Source
First, I modified the scraper to save the HTML that Selenium actually sees:

```typescript
// In amazon-scraper.ts scrapeProduct method
const pageSource = await this.driver.getPageSource();
const fs = await import("fs/promises");
await fs.writeFile("/tmp/amazon-debug.html", pageSource);
console.log("[DEBUG] Saved page to /tmp/amazon-debug.html");
```

This is critical because:
- Amazon's page structure varies significantly between products
- What you see in browser DevTools may differ from what Selenium sees
- The page source shows exactly what the scraper has access to

### Step 2: Search for Expected Text
Using the expected text from the plan document, I searched the saved HTML:

```bash
# Search for specific text we expect to find
grep -i "dial color" /tmp/amazon-debug.html

# Search for section IDs/classes
grep -i "about this item" /tmp/amazon-debug.html
```

**Finding:** Found "Dial Color: Gold Color: Silver / Gold" in the HTML, confirming it's present in the page.

### Step 3: Identify the Container Structure
Once I found the text, I worked backwards to find the containing element:

```bash
# Look for the section containing the text with context
grep -B 10 "About this item" /tmp/amazon-debug.html | grep -E "(id=|class=)"

# Find the specific div ID
grep -A 20 'id="productFactsDesktop_feature_div"' /tmp/amazon-debug.html
```

**Finding:** The "About this item" section lives in `#productFactsDesktop_feature_div` with this structure:
```html
<div id="productFactsDesktop_feature_div">
  <h3 class="product-facts-title">About this item</h3>
  <ul class="a-unordered-list a-vertical a-spacing-small">
    <li><span class="a-list-item">Dial Color: Gold Color: Silver / Gold</span></li>
    <!-- more items -->
  </ul>
</div>
```

### Step 4: Identify Patterns Across Products
Different Amazon products use different HTML structures:

**Watch product (Rolex):**
- Uses `#productFactsDesktop_feature_div`
- Contains both "Product details" and "About this item" sections
- Bullet points in `ul li span` structure

**Shirt product (Van Heusen):**
- Uses standard `#featurebullets_feature_div`
- Has fabric details in `.po-fabric_type` classes

**T-shirt product (Kingsted):**
- Also uses `#productFactsDesktop_feature_div`
- Care instructions in structured format

### Step 5: Update Selectors
Added the new selector to the scraper's priority list:

```typescript
const bulletSelectors = [
  "#productFactsDesktop_feature_div ul li span",  // NEW - catches watches, some clothing
  "#featurebullets_feature_div ul li span",        // Standard feature bullets
  "#feature-bullets ul li span.a-list-item",       // Older format
  // ... other fallbacks
];
```

Also added to the additional information section:
```typescript
const additionalInfoSelectors = [
  "#productFactsDesktop_feature_div",  // NEW - comprehensive product facts
  "#productDetails_feature_div",
  // ... other selectors
];
```

## Key Lessons

1. **Always inspect the actual HTML** - Don't rely on assumptions about Amazon's structure
2. **Use grep to find text** - Search for expected text first, then trace back to container
3. **Look for patterns** - Amazon uses consistent naming like `*_feature_div` for major sections
4. **Test multiple products** - Different product categories use different HTML structures
5. **Order matters** - Put more specific/newer selectors first in the priority list
6. **Use multiple strategies** - Scraper tries multiple selectors until one works

## Tools Used
- `grep -i "text"` - Case-insensitive search
- `grep -B 10` - Show 10 lines before match (context)
- `grep -A 20` - Show 20 lines after match
- `grep -E "(pattern1|pattern2)"` - Search for multiple patterns

## Testing Workflow
1. Add debug logging to save HTML: `await fs.writeFile("/tmp/amazon-debug.html", pageSource)`
2. Run scraper: `npx tsx test-scraper.ts`
3. Search HTML: `grep -i "expected text" /tmp/amazon-debug.html`
4. Find container: `grep -B 10 "text" /tmp/amazon-debug.html | grep id=`
5. Update selectors in scraper
6. Test again with HTML save removed
7. Verify all target URLs work

## Results
After adding `#productFactsDesktop_feature_div`, successfully extracted:
- ✅ Dial Color: Gold Color: Silver / Gold
- ✅ Clasp type: Double Locking Foldover Clasp
- ✅ Fabric type: 54% Cotton, 44% Recycled Polyester, 2% Elastane
- ✅ Care instructions: Machine wash cold, tumble dry low...
- ✅ Material: Polycotton
- ✅ All other product specifications from the plan
