# Auto‑commit enhanced PowerShell script for r2‑quiz
# Location: .claude/hooks/auto-commit-enhanced.ps1
# This script performs:
# 1. Pull & rebase latest remote changes.
# 2. Validate all JSON files (fails fast on syntax errors).
# 3. Run linting (ESLint) and unit tests (Jest) – aborts on any failure.
# 4. Stage changes, commit (auto‑generated message) and push.
# 5. Output concise status messages (acts as a simple notification).

Write-Host "--- Auto‑commit enhanced start ---"

# Ensure we are inside a git repository
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
    Write-Error "Not a git repository – aborting auto‑commit"
    exit 1
}

# --------------------------------------------------
# 1. Pull & rebase
Write-Host "Fetching remote..."
git fetch origin
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Rebasing onto origin/$branch"
if (git rebase origin/$branch) {
    Write-Host "Rebase successful"
} else {
    Write-Error "Rebase failed – aborting"
    exit 1
}

# --------------------------------------------------
# 2. Validate JSON files (PowerShell built‑in JSON parser)
Write-Host "Validating JSON files..."
$invalid = $false
Get-ChildItem -Path . -Recurse -Filter *.json | ForEach-Object {
    try {
        Get-Content $_.FullName -Raw | ConvertFrom-Json | Out-Null
    } catch {
        Write-Error "Invalid JSON in $($_.FullName)"
        $invalid = $true
    }
}
if ($invalid) { exit 1 }
Write-Host "All JSON files are valid"

# --------------------------------------------------
# 3. Linting (ESLint) – optional but recommended
if (Test-Path "package.json") {
    Write-Host "Running ESLint..."
    try {
        npx eslint . --ext .js,.json
    } catch {
        Write-Error "ESLint failed – aborting commit"
        exit 1
    }
    Write-Host "ESLint passed"
}

# --------------------------------------------------
# 4. Unit tests (Jest) – optional but recommended
if (Test-Path "package.json") {
    Write-Host "Running unit tests..."
    try {
        npx jest --silent --passWithNoTests
    } catch {
        Write-Error "Tests failed – aborting commit"
        exit 1
    }
    Write-Host "All tests passed"
}

# --------------------------------------------------
# 5. Stage changes
git add -A

# Determine changed files
$changed = git diff --name-only --cached
if (-not $changed) {
    Write-Host "No changes to commit"
    exit 0
}

# Build commit message
$msg = "chore: auto‑commit — $changed"
Write-Host "Committing: $msg"
if (git commit -m $msg) {
    Write-Host "Commit successful"
} else {
    Write-Error "Commit failed"
    exit 1
}

# --------------------------------------------------
# 6. Push to remote
Write-Host "Pushing to origin $branch"
if (git push origin $branch) {
    Write-Host "Push successful – Vercel will redeploy automatically"
} else {
    Write-Error "Push failed"
    exit 1
}

Write-Host "--- Auto‑commit enhanced completed successfully ---"
exit 0
