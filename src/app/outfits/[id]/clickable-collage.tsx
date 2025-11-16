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
}

export function ClickableCollage({
  imageUrl,
  collageMetadata,
  items,
  altText,
}: ClickableCollageProps) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMouseEnter = (box: BoundingBox) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = imageDimensions.width / originalWidth;
    const scaleY = imageDimensions.height / originalHeight;

    // Calculate center of the box
    const boxCenterX = rect.left + (box.x + box.width / 2) * scaleX;
    const boxTopY = rect.top + box.y * scaleY;

    setTooltipPosition({ x: boxCenterX, y: boxTopY });
    setHoveredItemId(box.itemId);
  };

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
                onMouseEnter={() => handleMouseEnter(box)}
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

      {/* Tooltip - rendered as fixed position to avoid clipping */}
      {hoveredItemId !== null && (() => {
        const box = boundingBoxes.find(b => b.itemId === hoveredItemId);
        if (!box) return null;

        const itemTitle = itemTitleMap.get(box.itemId);
        if (!itemTitle) return null;

        return (
          <div
            className="fixed pointer-events-none z-[9999]"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <div className="px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg whitespace-nowrap">
              {itemTitle}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
