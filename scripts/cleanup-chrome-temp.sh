#!/bin/bash

# Cleanup script for orphaned Chrome/ChromeDriver processes and temp directories
# Run this script if you notice disk space issues or orphaned Chrome processes

echo "==================================================================="
echo "Chrome/ChromeDriver Cleanup Script"
echo "==================================================================="
echo ""

# Kill orphaned Chrome processes related to webdriver/automation
echo "1. Checking for orphaned Chrome processes..."
CHROME_PROCESSES=$(ps aux | grep -i "chrome.*webdriver\|chrome.*headless.*scoped_dir" | grep -v grep | wc -l)

if [ "$CHROME_PROCESSES" -gt 0 ]; then
  echo "   Found $CHROME_PROCESSES orphaned Chrome processes"
  echo "   Killing processes..."
  pkill -9 -f "chrome.*webdriver" 2>/dev/null || true
  pkill -9 -f "chrome.*headless.*scoped_dir" 2>/dev/null || true
  echo "   ✓ Done"
else
  echo "   ✓ No orphaned Chrome processes found"
fi
echo ""

# Clean up orphaned Chrome temp directories
echo "2. Checking for orphaned Chrome temp directories..."
TEMP_DIRS=$(find /tmp -maxdepth 1 -name ".org.chromium.Chromium.scoped_dir.*" -type d 2>/dev/null | wc -l)
TEMP_DIRS_VAR=$(find /var/folders -name ".org.chromium.Chromium.scoped_dir.*" -type d 2>/dev/null | wc -l)
TOTAL_DIRS=$((TEMP_DIRS + TEMP_DIRS_VAR))

if [ "$TOTAL_DIRS" -gt 0 ]; then
  echo "   Found $TOTAL_DIRS orphaned temp directories"

  # Calculate size
  TEMP_SIZE=$(du -sh /tmp/.org.chromium.Chromium.scoped_dir.* 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
  VAR_SIZE=$(find /var/folders -name ".org.chromium.Chromium.scoped_dir.*" -type d -exec du -sh {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")

  echo "   Estimated size: ~${TEMP_SIZE}M in /tmp, ~${VAR_SIZE}M in /var/folders"
  echo "   Removing directories..."

  # Remove from /tmp
  find /tmp -maxdepth 1 -name ".org.chromium.Chromium.scoped_dir.*" -type d -exec rm -rf {} \; 2>/dev/null || true

  # Remove from /var/folders
  find /var/folders -name ".org.chromium.Chromium.scoped_dir.*" -type d -exec rm -rf {} \; 2>/dev/null || true

  echo "   ✓ Done"
else
  echo "   ✓ No orphaned temp directories found"
fi
echo ""

# Clean up ChromeDriver logs
echo "3. Checking for ChromeDriver logs..."
CHROMEDRIVER_LOGS=$(find . -name "chromedriver*.log" 2>/dev/null | wc -l)

if [ "$CHROMEDRIVER_LOGS" -gt 0 ]; then
  echo "   Found $CHROMEDRIVER_LOGS ChromeDriver log files"
  echo "   Removing logs..."
  find . -name "chromedriver*.log" -delete 2>/dev/null || true
  echo "   ✓ Done"
else
  echo "   ✓ No ChromeDriver logs found"
fi
echo ""

echo "==================================================================="
echo "Cleanup Complete!"
echo "==================================================================="
echo ""
echo "To prevent future issues:"
echo "1. Ensure scrapers properly call driver.quit() in finally blocks"
echo "2. Set up a cron job to run this script periodically"
echo "3. Monitor disk space regularly"
echo ""
