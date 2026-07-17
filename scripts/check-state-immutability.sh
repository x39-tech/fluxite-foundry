#!/bin/bash
#
# Checks that existing state version files have not been modified.
#
# State version files (src/app/persistentState/v*/state.ts) are immutable once
# committed. To make schema changes, create a new version directory with its own
# state.ts and migrate.ts files.
#
# This script is designed to run in pull request CI. It compares state files
# against the pull request's target branch, which is read from GITHUB_BASE_REF
# or from an explicit TARGET_BRANCH override when running locally.

set -e

STATE_PATTERN="src/app/persistentState/v*/state.ts"

TARGET_BRANCH="${TARGET_BRANCH:-$GITHUB_BASE_REF}"

# Check if we're in a pull request pipeline
if [ -z "$TARGET_BRANCH" ]; then
  echo "Not in a pull request pipeline, skipping state immutability check."
  exit 0
fi

echo "Checking state immutability against target branch: $TARGET_BRANCH"

# Fetch the target branch so we can compare against it.
# CI checkouts are typically shallow and omit the target branch.
git fetch origin "$TARGET_BRANCH" --depth=1

# Get state files that exist on the target branch
TARGET_STATE_FILES=$(git ls-tree -r --name-only "origin/$TARGET_BRANCH" -- $STATE_PATTERN 2>/dev/null || true)

if [ -z "$TARGET_STATE_FILES" ]; then
  echo "No existing state files found on $TARGET_BRANCH, nothing to check."
  exit 0
fi

echo "Found state files on $TARGET_BRANCH:"
echo "$TARGET_STATE_FILES"
echo ""

FAILED=0

for file in $TARGET_STATE_FILES; do
  if git diff --quiet "origin/$TARGET_BRANCH" -- "$file"; then
    echo "OK: $file (unchanged)"
  else
    echo "ERROR: $file has been modified."
    FAILED=1
  fi
done

echo ""

if [ $FAILED -ne 0 ]; then
  echo "State immutability check FAILED."
  echo ""
  echo "State version files are immutable once committed. To make schema changes:"
  echo "  1. Create a new version directory (e.g., vN/)"
  echo "  2. Add state.ts with the new schema and migrate.ts with the migration"
  echo "  3. Update persistentState.ts and persistentStateMigrations.ts to import and use the new version"
  exit 1
fi

echo "State immutability check passed."
