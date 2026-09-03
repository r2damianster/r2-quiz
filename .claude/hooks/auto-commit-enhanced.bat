@echo off
rem Auto‑commit enhanced batch script
rem Pull and rebase latest remote changes

git fetch origin
for /f %%b in ('git rev-parse --abbrev-ref HEAD') do set "branch=%%b"

echo Rebasing onto origin/%branch%
git rebase origin/%branch%
if errorlevel 1 (
  echo Rebase failed >&2
  exit /b 1
)

rem Validate all JSON files using PowerShell (available on Windows)
powershell -NoProfile -Command "Get-ChildItem -Recurse -Filter *.json | ForEach-Object { try { Get-Content $_.FullName -Raw | ConvertFrom-Json | Out-Null } catch { Write-Error \"Invalid JSON in $($_.FullName)\"; exit 1 } }"
if errorlevel 1 (
  echo JSON validation failed >&2
  exit /b 1
)

rem Stage changes
git add -A

rem Determine changed files
for /f "delims=" %%c in ('git diff --name-only --cached') do set "changed=%%c"
if "%changed%"=="" (
  echo No changes to commit
  exit /b 0
)

rem Build commit message
set "msg=chore: auto-commit — %changed%"
echo Committing: %msg%
git commit -m "%msg%"
if errorlevel 1 (
  echo Commit failed >&2
  exit /b 1
)

rem Push to remote
echo Pushing to origin %branch%
git push origin %branch%
if errorlevel 1 (
  echo Push failed >&2
  exit /b 1
)

echo --- Auto‑commit enhanced completed successfully ---
exit /b 0
