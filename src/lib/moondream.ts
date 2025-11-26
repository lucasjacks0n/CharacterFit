/**
 * Moondream Integration
 * Generates visual descriptions from inspiration photos using moondream-station
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export interface MoondreamResult {
  success: boolean;
  description?: string;
  error?: string;
}

/**
 * Generate a detailed costume description from an image URL using moondream-station
 *
 * Prerequisites:
 * - moondream-station must be running: `moondream-station`
 * - Python virtual environment must be set up with dependencies
 *
 * @param imageUrl - URL to the inspiration photo
 * @returns Promise with description or error
 */
export async function generateVisualDescription(
  imageUrl: string
): Promise<MoondreamResult> {
  if (!imageUrl || !imageUrl.trim()) {
    return {
      success: false,
      error: "Image URL is required",
    };
  }

  try {
    // Path to Python script
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "moondream-describe-image.py"
    );

    // Path to virtual environment Python
    const venvPython = path.join(process.cwd(), "ve", "bin", "python");

    // Execute Python script with virtual env
    const { stdout, stderr } = await execAsync(
      `"${venvPython}" "${scriptPath}" "${imageUrl}"`,
      {
        timeout: 90000, // 90 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      }
    );

    if (stderr && !stderr.includes("Warning")) {
      console.warn("Moondream stderr:", stderr);
    }

    const description = stdout.trim();

    if (!description) {
      return {
        success: false,
        error: "No description generated",
      };
    }

    return {
      success: true,
      description,
    };
  } catch (error: any) {
    console.error("Moondream error:", error);

    // Parse error message
    let errorMessage = "Failed to generate visual description";

    if (error.stderr) {
      // Extract meaningful error from stderr
      if (error.stderr.includes("Could not connect to moondream-station")) {
        errorMessage =
          "moondream-station is not running. Start it with: moondream-station";
      } else if (error.stderr.includes("Error downloading image")) {
        errorMessage = "Failed to download image from URL";
      } else {
        errorMessage = error.stderr.trim();
      }
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "Moondream request timed out";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if moondream-station is running and accessible
 */
export async function checkMoondreamAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:2020/v1/models", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
