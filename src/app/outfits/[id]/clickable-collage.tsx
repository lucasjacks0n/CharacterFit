"use client";

import { useState, useRef, useEffect } from "react";

interface BoundingBox {
  itemId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClothingItem {
  id: number;
  title: string;
  productUrl: string | null;
}

interface ClickableCollageProps {
  imageUrl: string;
  collageMetadata: string | null;
  items: ClothingItem[];
  altText: string;
  hoveredItemId?: number | null;
  onItemHover?: (itemId: number | null) => void;
}

export function ClickableCollage({
  imageUrl,
  collageMetadata,
  items,
  altText,
  hoveredItemId: externalHoveredItemId,
  onItemHover,
}: ClickableCollageProps) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [internalHoveredItemId, setInternalHoveredItemId] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external hover state if provided, otherwise use internal state
  const hoveredItemId = externalHoveredItemId !== undefined ? externalHoveredItemId : internalHoveredItemId;
  const setHoveredItemId = onItemHover || setInternalHoveredItemId;

  // Parse bounding boxes from metadata
  const boundingBoxes: BoundingBox[] = collageMetadata
    ? JSON.parse(collageMetadata)
    : [];

  // Original collage dimensions (from Python script)
  // 1640x1000 when merged with inspiration, 800x1000 without
  const originalWidth = boundingBoxes.length > 0 ? 1640 : 800;
  const originalHeight = 1000;

  // Update image dimensions on load and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [imageUrl]);

  // Create a map of item IDs to product URLs
  const itemUrlMap = new Map(
    items.map((item) => [item.id, item.productUrl])
  );

  // Create a map of item IDs to titles
  const itemTitleMap = new Map(
    items.map((item) => [item.id, item.title])
  );

  // If no bounding boxes, just show the image
  if (boundingBoxes.length === 0) {
    return (
      <img
        ref={imageRef}
        src={imageUrl}
        alt={altText}
        className="w-full h-auto"
        onLoad={() => {
          if (imageRef.current) {
            setImageDimensions({
              width: imageRef.current.offsetWidth,
              height: imageRef.current.offsetHeight,
            });
          }
        }}
      />
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative overflow-visible">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={altText}
          className="w-full h-auto"
          onLoad={() => {
            if (imageRef.current) {
              setImageDimensions({
                width: imageRef.current.offsetWidth,
                height: imageRef.current.offsetHeight,
              });
            }
          }}
        />

        {/* Clickable overlays */}
        {imageDimensions.width > 0 &&
          boundingBoxes.map((box) => {
            const productUrl = itemUrlMap.get(box.itemId);
            const itemTitle = itemTitleMap.get(box.itemId);

            // Skip if no product URL
            if (!productUrl) return null;

            // Calculate percentage-based position and size
            const leftPercent = (box.x / originalWidth) * 100;
            const topPercent = (box.y / originalHeight) * 100;
            const widthPercent = (box.width / originalWidth) * 100;
            const heightPercent = (box.height / originalHeight) * 100;

            // Add Amazon affiliate tag if it's an Amazon URL
            const finalUrl = productUrl.includes("amazon.com")
              ? `${productUrl}${productUrl.includes("?") ? "&" : "?"}tag=characterfits-20`
              : productUrl;

            return (
              <a
                key={box.itemId}
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute group"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                }}
                onMouseEnter={() => setHoveredItemId(box.itemId)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                {/* Invisible clickable area */}
                <div className="absolute inset-0 cursor-pointer" />

                {/* Hover overlay */}
                <div
                  className={`absolute inset-0 border-2 border-black transition-opacity ${
                    hoveredItemId === box.itemId ? "opacity-100" : "opacity-0"
                  } group-hover:opacity-100`}
                />
              </a>
            );
          })}
      </div>
    </>
  );
}
