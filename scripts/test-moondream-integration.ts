#!/usr/bin/env tsx
/**
 * Integration test for moondream visual description generation
 *
 * Prerequisites:
 * - moondream-station must be running: moondream-station
 * - Python virtual environment must be set up with dependencies
 *
 * Usage:
 *   npx tsx scripts/test-moondream-integration.ts
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { db } from "../src/db";
import { outfits } from "../src/db/schema";
import { isNotNull } from "drizzle-orm";

const execAsync = promisify(exec);

// Will be populated from database
let TEST_IMAGE_URL: string | null = null;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function fetchTestImageUrl(): Promise<TestResult> {
  try {
    // Fetch an outfit with an inspiration photo URL
    const outfitsWithPhotos = await db
      .select({
        id: outfits.id,
        name: outfits.name,
        inspirationPhotoUrl: outfits.inspirationPhotoUrl,
      })
      .from(outfits)
      .where(isNotNull(outfits.inspirationPhotoUrl))
      .limit(1);

    if (outfitsWithPhotos.length === 0) {
      return {
        name: "Fetch Test Image URL",
        passed: false,
        message: "❌ No outfits with inspiration photos found in database",
        details: "Add an outfit with an inspirationPhotoUrl to test with real data",
      };
    }

    TEST_IMAGE_URL = outfitsWithPhotos[0].inspirationPhotoUrl;

    return {
      name: "Fetch Test Image URL",
      passed: true,
      message: `✅ Found test image from outfit "${outfitsWithPhotos[0].name}"`,
      details: { url: TEST_IMAGE_URL },
    };
  } catch (error: any) {
    return {
      name: "Fetch Test Image URL",
      passed: false,
      message: "❌ Failed to fetch test image URL from database",
      details: error.message,
    };
  }
}

async function checkMoondreamStation(): Promise<TestResult> {
  try {
    const response = await fetch("http://localhost:2020/v1/models", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        name: "Moondream Station Availability",
        passed: true,
        message: "✅ moondream-station is running and accessible",
      };
    } else {
      return {
        name: "Moondream Station Availability",
        passed: false,
        message: `❌ moondream-station returned status ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: "Moondream Station Availability",
      passed: false,
      message: "❌ moondream-station is not running",
      details: "Start it with: moondream-station",
    };
  }
}

async function testPythonScriptExecution(): Promise<TestResult> {
  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "moondream-describe-image.py"
    );
    const venvPython = path.join(process.cwd(), "ve", "bin", "python");

    console.log(`\nExecuting: ${venvPython} ${scriptPath} ${TEST_IMAGE_URL}`);
    console.log("This may take 30-60 seconds...\n");

    const startTime = Date.now();

    const { stdout, stderr } = await execAsync(
      `"${venvPython}" "${scriptPath}" "${TEST_IMAGE_URL}"`,
      {
        timeout: 90000, // 90 second timeout
        maxBuffer: 1024 * 1024,
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const description = stdout.trim();

    // Validate output
    if (!description) {
      return {
        name: "Python Script Execution",
        passed: false,
        message: "❌ Script returned empty output",
        details: { stderr, stdout },
      };
    }

    if (description.length < 50) {
      return {
        name: "Python Script Execution",
        passed: false,
        message: "❌ Description too short (< 50 chars)",
        details: { description, length: description.length },
      };
    }

    // Check for common error patterns
    if (description.toLowerCase().includes("error")) {
      return {
        name: "Python Script Execution",
        passed: false,
        message: "❌ Description contains error message",
        details: { description },
      };
    }

    return {
      name: "Python Script Execution",
      passed: true,
      message: `✅ Generated description (${description.length} chars in ${duration}s)`,
      details: {
        description,
        length: description.length,
        duration: `${duration}s`,
        stderr: stderr || "none",
      },
    };
  } catch (error: any) {
    return {
      name: "Python Script Execution",
      passed: false,
      message: "❌ Script execution failed",
      details: {
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout,
      },
    };
  }
}

async function testWithInvalidImageUrl(): Promise<TestResult> {
  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "moondream-describe-image.py"
    );
    const venvPython = path.join(process.cwd(), "ve", "bin", "python");

    const invalidUrl = "https://example.com/nonexistent-image.jpg";

    const { stdout, stderr } = await execAsync(
      `"${venvPython}" "${scriptPath}" "${invalidUrl}"`,
      {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }
    );

    // Should have failed but didn't
    return {
      name: "Invalid Image URL Handling",
      passed: false,
      message: "❌ Script should have failed with invalid URL",
      details: { stdout, stderr },
    };
  } catch (error: any) {
    // Expected to fail - check if it failed gracefully
    if (error.stderr && error.stderr.includes("Error downloading image")) {
      return {
        name: "Invalid Image URL Handling",
        passed: true,
        message: "✅ Script properly handles invalid image URLs",
      };
    } else {
      return {
        name: "Invalid Image URL Handling",
        passed: false,
        message: "❌ Script failed but with unexpected error",
        details: { error: error.message, stderr: error.stderr },
      };
    }
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("MOONDREAM INTEGRATION TEST");
  console.log("=".repeat(60));
  console.log();

  // Test 0: Fetch test image URL from database
  console.log("Test 0: Fetching test image URL from database...");
  const imageUrlTest = await fetchTestImageUrl();
  results.push(imageUrlTest);
  console.log(imageUrlTest.message);
  if (imageUrlTest.details) {
    if (typeof imageUrlTest.details === "string") {
      console.log(`  ${imageUrlTest.details}`);
    } else if (imageUrlTest.details.url) {
      console.log(`  URL: ${imageUrlTest.details.url}`);
    }
  }

  // If no test image found, skip remaining tests
  if (!imageUrlTest.passed || !TEST_IMAGE_URL) {
    console.log("\n⚠️  Skipping remaining tests - no test image available");
    printSummary();
    process.exit(1);
  }

  // Test 1: Check moondream-station availability
  console.log("\nTest 1: Checking moondream-station availability...");
  const stationTest = await checkMoondreamStation();
  results.push(stationTest);
  console.log(stationTest.message);
  if (stationTest.details) {
    console.log(`  ${stationTest.details}`);
  }

  // If moondream-station is not running, skip remaining tests
  if (!stationTest.passed) {
    console.log("\n⚠️  Skipping remaining tests - moondream-station not available");
    console.log("Start it with: moondream-station");
    printSummary();
    process.exit(1);
  }

  // Test 2: Execute Python script with valid image
  console.log("\nTest 2: Testing Python script with image URL...");
  const scriptTest = await testPythonScriptExecution();
  results.push(scriptTest);
  console.log(scriptTest.message);
  if (scriptTest.details) {
    console.log("\n  Details:");
    if (scriptTest.details.description) {
      console.log(`  Description: "${scriptTest.details.description.substring(0, 200)}..."`);
    }
    console.log(`  Length: ${scriptTest.details.length || 'N/A'} characters`);
    console.log(`  Duration: ${scriptTest.details.duration || 'N/A'}`);
    if (scriptTest.details.stderr && scriptTest.details.stderr !== "none") {
      console.log(`  Stderr: ${scriptTest.details.stderr}`);
    }
  }

  // Test 3: Test error handling with invalid URL
  console.log("\nTest 3: Testing error handling with invalid image URL...");
  const errorTest = await testWithInvalidImageUrl();
  results.push(errorTest);
  console.log(errorTest.message);

  printSummary();
}

function printSummary() {
  console.log();
  console.log("=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
  });

  console.log();
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\n❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test execution failed:", error);
  process.exit(1);
});
