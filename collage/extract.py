#!/usr/bin/env python3
"""
Extract products from white/light-background images by
background-color estimation + connected components.
Each detected object is saved as its own PNG with transparent background.

Requirements:
    pip install pillow numpy scipy
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_opening, binary_closing, binary_fill_holes

# Parameters you can tweak
BORDER_WIDTH = 8  # how many pixels around the edge to sample for bg color
COLOR_EPS = 0.04  # color distance threshold (0..1). Smaller = stricter
MIN_COMPONENT_PIXELS = 200  # ignore tiny specks / noise


def estimate_background_color(img_float):
    """
    Estimate background color by averaging pixels along the image border.
    img_float: (H, W, 3) in [0,1]
    """
    h, w, _ = img_float.shape
    b = BORDER_WIDTH

    top = img_float[:b, :, :]
    bottom = img_float[h - b : h, :, :]
    left = img_float[:, :b, :]
    right = img_float[:, w - b : w, :]

    border_pixels = np.concatenate(
        [
            top.reshape(-1, 3),
            bottom.reshape(-1, 3),
            left.reshape(-1, 3),
            right.reshape(-1, 3),
        ],
        axis=0,
    )

    # Use median to be robust to occasional product pixels on the border
    bg_color = np.median(border_pixels, axis=0)  # shape (3,)
    return bg_color


def extract_products_from_image(image_path, output_dir):
    """
    Extract each product from a light-background image and save as PNGs.
    """
    print(f"Processing {os.path.basename(image_path)}")

    # Load image
    image = Image.open(image_path).convert("RGB")
    img = np.array(image).astype(np.float32) / 255.0  # [0,1]
    h, w = img.shape[:2]

    # 1) Estimate background color
    bg_color = estimate_background_color(img)

    # 2) Compute per-pixel color distance from background
    diff = img - bg_color[None, None, :]  # (H, W, 3)
    dist = np.linalg.norm(diff, axis=2)  # (H, W)

    # 3) Foreground mask: pixels far enough from background color
    #    (works even for white shoes because they're slightly off-bg)
    fg_mask = dist > COLOR_EPS

    # Clean up mask (remove noise, fill tiny gaps)
    fg_mask = binary_opening(fg_mask, iterations=1)
    fg_mask = binary_closing(fg_mask, iterations=1)
    fg_mask = binary_fill_holes(fg_mask)

    if not fg_mask.any():
        print("  No foreground found, skipping.")
        return

    # 4) Connected components to separate objects
    labeled, num = label(fg_mask)
    print(f"  Found {num} connected component(s) (before size filter)")

    base_name = os.path.splitext(os.path.basename(image_path))[0]

    obj_index = 0
    img_rgb_255 = (img * 255).astype(np.uint8)

    for comp_id in range(1, num + 1):
        comp_mask = labeled == comp_id

        # Skip tiny components
        if comp_mask.sum() < MIN_COMPONENT_PIXELS:
            continue

        obj_index += 1

        # 5) Get bounding box of this component
        ys, xs = np.where(comp_mask)
        y_min, y_max = ys.min(), ys.max()
        x_min, x_max = xs.min(), xs.max()

        # Crop RGB region
        crop_rgb = img_rgb_255[y_min : y_max + 1, x_min : x_max + 1]

        # Crop mask and turn into alpha channel
        crop_mask = comp_mask[y_min : y_max + 1, x_min : x_max + 1]
        alpha = crop_mask.astype(np.uint8) * 255

        # 6) Build RGBA image
        rgba = np.zeros((crop_rgb.shape[0], crop_rgb.shape[1], 4), dtype=np.uint8)
        rgba[:, :, :3] = crop_rgb
        rgba[:, :, 3] = alpha

        result = Image.fromarray(rgba, "RGBA")

        out_name = f"{base_name}_obj{obj_index}.png"
        out_path = os.path.join(output_dir, out_name)
        result.save(out_path, "PNG")
        print(f"  Saved {out_name}")
        break  # only want to save one product per image

    if obj_index == 0:
        print("  Only tiny components found; nothing saved.")


def main():
    import sys

    # Accept input/output dirs from command line or environment
    input_dir = sys.argv[1] if len(sys.argv) > 1 else os.getenv("INPUT_DIR", "test_images")
    output_dir = sys.argv[2] if len(sys.argv) > 2 else os.getenv("OUTPUT_DIR", "out")

    os.makedirs(output_dir, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    image_files = [
        f
        for f in os.listdir(input_dir)
        if os.path.splitext(f.lower())[1] in image_extensions
    ]

    if not image_files:
        print(f"No images found in {input_dir}")
        return

    print(f"Found {len(image_files)} images to process\n")

    for filename in image_files:
        path = os.path.join(input_dir, filename)
        try:
            extract_products_from_image(path, output_dir)
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    print(f"\nDone! Products saved in: {output_dir}/")


if __name__ == "__main__":
    main()
