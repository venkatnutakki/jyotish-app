@echo off
setlocal EnableDelayedExpansion
REM Double-click to push the latest commits to GitHub (which redeploys Vercel).
REM Stages everything, commits any pending changes, then pushes main to origin.
cd /d "%~dp0"

echo ===============================================
echo   Jyotish - push to GitHub (redeploys Vercel)
echo ===============================================
echo.

REM Stage and commit anything not yet committed (skips if nothing changed).
git add -A
git diff --cached --quiet
if errorlevel 1 (
  set "MSG="
  set /p "MSG=Commit message (press Enter for 'update'): "
  if "!MSG!"=="" set "MSG=update"
  git commit -m "!MSG!"
) else (
  echo No new changes to commit - pushing existing commits.
)

echo.
echo Pushing to origin/main ...
git push origin main

echo.
if errorlevel 1 (
  echo *** PUSH FAILED - see the message above. ***
) else (
  echo *** Done. Vercel will redeploy automatically in a minute or two. ***
)
echo.
pause
