#!/usr/bin/env bash
set -e

# Pull latest changes and rebase to avoid conflicts
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Fetching remote..."
  git fetch origin
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "Rebasing onto origin/$CURRENT_BRANCH"
  git rebase origin/$CURRENT_BRANCH || {
    echo "Rebase failed – aborting auto‑commit"; exit 1; }
fi

# Validate all JSON files using jq (installed in the environment)
INVALID_FILES=$(find . -name "*.json" -type f -exec jq empty {} \; -print -quit 2>/dev/null || true)
if [ -n "$INVALID_FILES" ]; then
  echo "JSON validation failed for $INVALID_FILES"; exit 1;
fi

# Placeholder for linting (e.g., eslint) – can be added later
# echo "Running linters..."
# npm run lint

# Stage changes
git add -A

# Build commit message with list of changed files
CHANGED=$(git diff --name-only --cached | tr '\n' ' ')
if [ -z "$CHANGED" ]; then
  echo "No changes to commit"
  exit 0
fi

MSG="chore: auto‑commit — $CHANGED"

git commit -m "$MSG" || { echo "Commit failed – maybe nothing to commit"; exit 1; }

# Push to the current branch
git push origin $(git rev-parse --abbrev-ref HEAD)

echo "Auto‑commit‑enhanced completed successfully"
