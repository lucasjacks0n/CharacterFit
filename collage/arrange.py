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


def main():
    """Process all extracted images and create collage."""
    import sys

    # Accept input dir and output file from command line or environment
    input_dir = sys.argv[1] if len(sys.argv) > 1 else os.getenv("INPUT_DIR", "out")
    output_file = (
        sys.argv[2]
        if len(sys.argv) > 2
        else os.getenv("OUTPUT_FILE", "collages/collage.png")
    )

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

    if collage:
        collage.save(output_file, "PNG")
        print(f"\nCollage saved to {output_file}")
        print(f"Size: {collage.width}x{collage.height}")


if __name__ == "__main__":
    main()
