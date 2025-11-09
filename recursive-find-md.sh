#!/bin/bash

# recursive-find-md.sh
# Recursively find all markdown files (.md and .mdc) in the current directory
# Excludes common directories like node_modules, .next, .git

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory to search (default: current directory)
SEARCH_DIR="${1:-.}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Scanning for markdown files in: ${SEARCH_DIR}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Find all markdown files recursively, excluding common directories
# Using find command with exclusions
FILES=$(find "$SEARCH_DIR" -type f \( -name "*.md" -o -name "*.mdc" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.cache/*" \
  -not -path "*/coverage/*" \
  2>/dev/null)

# Count files
FILE_COUNT=$(echo "$FILES" | grep -v '^$' | wc -l | tr -d ' ')

echo -e "${GREEN}Found ${FILE_COUNT} markdown file(s)${NC}"
echo ""

# Display files if any found
if [ "$FILE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}Markdown files found:${NC}"
  echo ""
  
  # Display files with relative paths
  echo "$FILES" | while IFS= read -r file; do
    if [ -n "$file" ]; then
      # Get file size
      SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
      # Convert to human readable if possible
      if command -v numfmt >/dev/null 2>&1; then
        SIZE_HR=$(numfmt --to=iec-i --suffix=B "$SIZE" 2>/dev/null || echo "${SIZE}B")
      else
        SIZE_HR="${SIZE}B"
      fi
      
      # Get relative path
      REL_PATH="${file#$SEARCH_DIR/}"
      echo -e "  ${GREEN}✓${NC} ${REL_PATH} (${SIZE_HR})"
    fi
  done
  
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Total: ${FILE_COUNT} file(s)${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${YELLOW}No markdown files found.${NC}"
fi

# Optional: Show file contents (commented out by default)
# Uncomment the following section if you want to see file contents
#
# if [ "$FILE_COUNT" -gt 0 ]; then
#   echo ""
#   echo -e "${YELLOW}File contents:${NC}"
#   echo ""
#   echo "$FILES" | while IFS= read -r file; do
#     if [ -n "$file" ]; then
#       REL_PATH="${file#$SEARCH_DIR/}"
#       echo -e "${BLUE}--- File: ${REL_PATH} ---${NC}"
#       cat "$file"
#       echo ""
#     fi
#   done
# fi

