#!/usr/bin/env python3
"""
Moondream Image Description Script
Generates costume/outfit descriptions from inspiration photos using moondream-station.
"""

import sys
import os
import requests
import moondream as md
from io import BytesIO
from PIL import Image

def download_and_open_image(url: str) -> Image.Image:
    """Download image from URL and return as PIL Image"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Open image and convert to RGB (moondream expects RGB)
        img = Image.open(BytesIO(response.content))
        if img.mode != 'RGB':
            img = img.convert('RGB')

        return img
    except Exception as e:
        print(f"Error downloading image: {e}", file=sys.stderr)
        sys.exit(1)

def describe_costume(image_url: str) -> str:
    """
    Generate detailed costume description using moondream-station.

    Args:
        image_url: URL to the inspiration photo

    Returns:
        Detailed costume description from moondream
    """
    # Download and open image
    image = download_and_open_image(image_url)

    # Prepare prompt for moondream
    prompt = """Describe this costume/outfit in detail for someone trying to recreate it. Focus on:
- Colors and color palette
- Main clothing pieces (jacket, shirt, pants, dress, etc.)
- Textures and materials (leather, fabric, metal, etc.)
- Accessories (jewelry, weapons, props, hats, etc.)
- Hair and makeup styling
- Overall aesthetic and vibe

Be specific about visual details like patterns, cuts, and styling."""

    # Connect to moondream-station and query
    try:
        # Connect to local moondream-station
        model = md.vl(endpoint="http://localhost:2020/v1")

        # Query the model
        result = model.query(image, prompt)

        # Extract the answer
        description = result.get("answer", "")

        if not description:
            raise ValueError("Empty response from moondream")

        return description.strip()

    except Exception as e:
        error_msg = str(e).lower()
        if "connection" in error_msg or "refused" in error_msg:
            print("Error: Could not connect to moondream-station at http://localhost:2020", file=sys.stderr)
            print("Make sure moondream-station is running with: moondream-station", file=sys.stderr)
        else:
            print(f"Error calling moondream API: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) != 2:
        print("Usage: python moondream-describe-image.py <image_url>", file=sys.stderr)
        sys.exit(1)

    image_url = sys.argv[1]

    # Generate description
    description = describe_costume(image_url)

    # Output to stdout (this will be captured by Node.js)
    print(description)

if __name__ == "__main__":
    main()
