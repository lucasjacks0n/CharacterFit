A big part of this project will be amazon scraping
Our current amazon scraper lives in src/lib/scrapers
We will want to extract as much text / description as possible
Amazon scatters description text so there may be multiple sources we want to scrape.
We will concat everything and put it in description, but only description content, no reviews
I'm going to provide links below and pieces of text I expect to see to guide what we need to scrape

https://www.amazon.com/Rolex-16013-Datejust-Steel-Jubilee/dp/B0CDS2TMPF
- Dial Color: Gold Color: Silver / Gold
- 18 x 16 x 12 inches; 5 Pounds
- Date First Available
- 18 x 16 x 12 inches; 5 Pounds
- Used AB Rank: Exterior: Scratches, dirt, Interior: Scratches, Metal Fittings
- Clasp type
- Double Locking Foldover Clasp

https://www.amazon.com/Van-Heusen-Originals-Regular-Comfortable/dp/B0F74NT2P4
- Fabric type
- 54% Cotton, 44% Recycled Polyester, 2% Elastane
- Machine Wash
- Neck style
- modern silhouette with contrast collar and cuff details for an added touch of sophistication
- Van Heusen combines classic design with modern innovations,
- VFA25MST-17306
- The Van Heusen Originals Slim Fit Long Sleeve Shirt combines sleek style with comfort for the modern man

https://www.amazon.com/dp/B0CVX4DV63
- Polycotton
- Machine wash cold, tumble dry low, wrinkle resistant, iron on low if needed, do not bleach.
- Bundle & Save on our short sleeve t-shirts



ignore Best Sellers Rank and Customer Reviews