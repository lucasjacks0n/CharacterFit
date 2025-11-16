#!/usr/bin/env python3
"""
Arrange extracted product images into a single 800x1000 collage
with a Pinterest-style masonry layout and flex-like vertical spacing.

- Columns are masonry-assigned (shortest column gets next image)
- All images are scaled to fit column width (no upscaling)
- Outer columns use "space-between" vertically
- Middle columns use "space-around" vertically so they sit more inside
"""

import os
import math
from PIL import Image


def load_product_images(input_dir):
    """Load all image files from the input directory."""
    image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".gif"}
    image_files = [
        f
        for f in os.listdir(input_dir)
        if os.path.splitext(f.lower())[1] in image_extensions
    ]

    images = []
    for filename in sorted(image_files):
        filepath = os.path.join(input_dir, filename)
        img = Image.open(filepath)
        # Convert to RGBA to handle transparency if present
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        images.append((filename, img))

    return images


def arrange_products_masonry(
    images,
    canvas_width=800,
    canvas_height=1000,
    bg_color=(255, 255, 255, 255),
    outer_padding=40,  # padding between canvas edge and columns
):
    """
    Arrange product images in a masonry layout:

    - Fixed column width
    - Images resized to fit column (no upscaling)
    - Each new image placed in the currently shortest column
    - Then, within each column, items are vertically distributed:
        * Edge columns: space-between (touch top & bottom)
        * Middle columns: space-around (float more inside)
    """
    num_images = len(images)
    if num_images == 0:
        print("No images to arrange!")
        return None

    print(f"Arranging {num_images} images in masonry layout")

    # Decide how many columns to use
    if num_images <= 4:
        num_cols = 2
    elif num_images <= 9:
        num_cols = 3
    else:
        num_cols = 4

    # Compute column width
    total_h_padding = outer_padding * (num_cols + 1)
    col_width = (canvas_width - total_h_padding) // num_cols
    print(f"Using {num_cols} columns, each {col_width}px wide")

    # --- First pass: compute base scaled sizes (fit to column, no upscaling) ---
    base_sizes = []  # (width, height) after column-width scaling
    for filename, img in images:
        if img.width == 0 or img.height == 0:
            base_sizes.append((0, 0))
            continue

        # Scale to column width, but don't upscale tiny images
        scale = min(1.0, col_width / img.width)
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)
        base_sizes.append((new_width, new_height))
        print(
            f"  Base size {filename}: {img.width}x{img.height} -> {new_width}x{new_height}"
        )

    def plan_layout(sizes, vertical_gap=20):
        """Given a list of (w, h), assign each to a column and return placements + max col height."""
        heights = [outer_padding] * num_cols  # current bottom of each column
        placements = []  # for each image index: (col_idx, y)

        for w, h in sizes:
            # choose column with smallest current height
            col_idx = min(range(num_cols), key=lambda i: heights[i])
            y = heights[col_idx]
            placements.append((col_idx, y))
            heights[col_idx] += h + vertical_gap

        max_height = max(heights) if heights else outer_padding
        return placements, max_height

    # First layout with base sizes to see how tall it is
    _, max_height_base = plan_layout(base_sizes)

    # Available vertical space (inside outer padding)
    available_height = canvas_height - 2 * outer_padding
    content_height = max_height_base - outer_padding  # subtract initial top padding

    if content_height <= 0:
        global_scale = 1.0
    else:
        # If content is taller than available space, shrink everything
        global_scale = min(1.0, available_height / content_height)

    print(f"Global vertical scale factor: {global_scale:.3f}")

    # --- Second pass: apply global scale and recalc layout ---
    final_sizes = []
    for bw, bh in base_sizes:
        fw = int(bw * global_scale)
        fh = int(bh * global_scale)
        final_sizes.append((fw, fh))

    placements, _ = plan_layout(final_sizes)

    # ---- Vertically redistribute within each column ----
    cols = [[] for _ in range(num_cols)]
    for i, (c_idx, y) in enumerate(placements):
        cols[c_idx].append(i)

    for c_idx in range(num_cols):
        indices = cols[c_idx]
        if not indices:
            continue

        heights = [final_sizes[i][1] for i in indices]
        total_items_height = sum(heights)

        # One item: vertically center in column
        if len(indices) == 1:
            h = heights[0]
            y = (canvas_height - h) // 2
            placements[indices[0]] = (c_idx, y)
            continue

        # Multiple items
        available = canvas_height - 2 * outer_padding

        is_edge_column = (c_idx == 0) or (c_idx == num_cols - 1)

        if is_edge_column:
            # space-between: items start at outer_padding and end at canvas_height-outer_padding
            spacing = (available - total_items_height) / (len(indices) - 1)
            y = outer_padding
        else:
            # middle columns: space-around: equal space above first and below last
            spacing = (available - total_items_height) / (len(indices) + 1)
            y = outer_padding + spacing

        for img_index in indices:
            placements[img_index] = (c_idx, y)
            y += final_sizes[img_index][1] + spacing

    # Create canvas
    canvas = Image.new("RGBA", (canvas_width, canvas_height), bg_color)

    # Paste each image
    for (filename, img), (w, h), (col_idx, y) in zip(images, final_sizes, placements):
        if w == 0 or h == 0:
            continue

        img_resized = img.resize((w, h), Image.Resampling.LANCZOS)

        # X position: left padding + column offset + center within column width
        x_col_start = outer_padding + col_idx * (col_width + outer_padding)
        x = x_col_start + (col_width - w) // 2

        canvas.paste(img_resized, (x, int(y)), img_resized)
        print(f"  Placed {filename} at ({x}, {int(y)}) in column {col_idx}")

    print("\nImages arranged in masonry layout with mixed space-between/space-around")
    return canvas


def merge_with_inspiration(inspiration_path, collage_img, gap=40):
    """
    Merge inspiration photo (left) with clothing collage (right).

    Inspiration photo is zoomed/cropped to fill 800x1000 (matching collage size).
    Uses center crop to maintain focus.

    Args:
        inspiration_path: Path to the inspiration photo
        collage_img: PIL Image of the clothing collage (800x1000)
        gap: Gap in pixels between the two images (default 40)

    Returns:
        PIL Image of the merged collage
    """
    # Load inspiration photo
    print(f"\nLoading inspiration photo from {inspiration_path}")
    inspiration = Image.open(inspiration_path)
    if inspiration.mode != "RGBA":
        inspiration = inspiration.convert("RGBA")

    # Target dimensions (match collage size)
    target_width = 800
    target_height = 1000

    # Calculate scale to fill the target area (cover behavior)
    # Scale so the smaller dimension fits, then crop the overflow
    scale_width = target_width / inspiration.width
    scale_height = target_height / inspiration.height
    scale = max(scale_width, scale_height)  # Use max to fill/cover

    # Resize with the fill scale
    new_width = int(inspiration.width * scale)
    new_height = int(inspiration.height * scale)
    inspiration_scaled = inspiration.resize((new_width, new_height), Image.Resampling.LANCZOS)
    print(f"Inspiration photo scaled to {new_width}x{new_height}")

    # Center crop to target size
    left = (new_width - target_width) // 2
    top = (new_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height
    inspiration_cropped = inspiration_scaled.crop((left, top, right, bottom))
    print(f"Inspiration photo cropped to {target_width}x{target_height} (center crop)")

    # Collage is already 800x1000
    collage_width = collage_img.width
    collage_height = collage_img.height

    # Calculate merged canvas dimensions (both same height now)
    total_width = target_width + gap + collage_width
    canvas_height = target_height  # Both images are same height

    print(f"Creating merged canvas: {total_width}x{canvas_height}")

    # Create white canvas
    merged = Image.new("RGBA", (total_width, canvas_height), (255, 255, 255, 255))

    # Paste inspiration photo on left (no vertical offset needed, same height)
    merged.paste(inspiration_cropped, (0, 0), inspiration_cropped)
    print(f"Pasted inspiration at (0, 0)")

    # Paste collage on right (after gap)
    collage_x = target_width + gap
    merged.paste(collage_img, (collage_x, 0), collage_img)
    print(f"Pasted collage at ({collage_x}, 0)")

    return merged


def main():
    """Process all extracted images and create collage."""
    import sys
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Arrange product images into a collage")
    parser.add_argument("input_dir", help="Directory containing product images")
    parser.add_argument("output_file", help="Output path for the collage")
    parser.add_argument("--inspiration", help="Path to inspiration photo to merge (optional)")

    args = parser.parse_args()

    input_dir = args.input_dir
    output_file = args.output_file
    inspiration_path = args.inspiration

    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Load images
    print(f"Loading images from {input_dir}/\n")
    images = load_product_images(input_dir)

    if not images:
        print(f"No images found in {input_dir}/")
        return

    print(f"Loaded {len(images)} images\n")

    # Arrange into collage (masonry + flexy vertical spacing)
    collage = arrange_products_masonry(
        images,
        canvas_width=800,
        canvas_height=1000,
    )

    if not collage:
        return

    # If inspiration photo provided, merge it with the collage
    if inspiration_path and os.path.exists(inspiration_path):
        print(f"\nMerging with inspiration photo...")
        final_collage = merge_with_inspiration(inspiration_path, collage)
    else:
        if inspiration_path:
            print(f"\nWarning: Inspiration photo not found at {inspiration_path}, using collage only")
        final_collage = collage

    # Save final result
    final_collage.save(output_file, "PNG")
    print(f"\nCollage saved to {output_file}")
    print(f"Size: {final_collage.width}x{final_collage.height}")


if __name__ == "__main__":
    main()
