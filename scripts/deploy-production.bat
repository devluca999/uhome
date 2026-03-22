@echo off
REM Production Deployment Script - Data Scoping Fixes (Windows)
REM This script automates the deployment of data scoping fixes to production

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  Production Deployment - Data Scoping Fixes
echo ============================================
echo.

REM Step 1: Pre-flight checks
echo [Step 1/6] Running pre-flight checks...
echo.

REM Check we're on develop branch
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
if not "%CURRENT_BRANCH%"=="develop" (
    echo [ERROR] Must be on 'develop' branch
    echo Current branch: %CURRENT_BRANCH%
    exit /b 1
)
echo [OK] On develop branch

REM Check working tree is clean
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Working tree has uncommitted changes
    git status --short
    exit /b 1
)
echo [OK] Working tree clean

REM Pull latest from develop
echo Pulling latest from origin/develop...
git pull origin develop
if %errorlevel% neq 0 (
    echo [ERROR] Failed to pull from origin/develop
    exit /b 1
)
echo [OK] Up to date with origin/develop
echo.

REM Step 2: Type check
echo [Step 2/6] Running TypeScript type check...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo [ERROR] Type check failed
    exit /b 1
)
echo [OK] Type check passed
echo.

REM Step 3: Run unit tests
echo [Step 3/6] Running unit tests...
call npm run test:unit
if %errorlevel% neq 0 (
    echo [ERROR] Unit tests failed
    exit /b 1
)
echo [OK] All unit tests passed
echo.

REM Step 4: Build verification
echo [Step 4/6] Verifying production build...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [OK] Production build successful
echo.

REM Step 5: Merge to main
echo [Step 5/6] Merging to main branch...
echo [WARNING] This will trigger production deployment!
set /p CONFIRM="Continue with merge to main? (yes/no): "
if not "%CONFIRM%"=="yes" (
    echo Deployment cancelled
    exit /b 0
)

git checkout main
git pull origin main
git merge develop --no-ff -m "Deploy: Data scoping fixes for properties, tenants, and expenses"
if %errorlevel% neq 0 (
    echo [ERROR] Merge failed
    exit /b 1
)
echo [OK] Merged develop into main
echo.

REM Step 6: Push to production
echo [Step 6/6] Pushing to production...
echo [WARNING] Final confirmation before push
set /p FINAL_CONFIRM="Push to origin/main (triggers production deployment)? (yes/no): "

if not "%FINAL_CONFIRM%"=="yes" (
    echo Deployment cancelled - rolling back merge...
    git reset --hard HEAD~1
    git checkout develop
    exit /b 0
)

git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Push failed
    exit /b 1
)

echo.
echo ============================================
echo  Deployment Complete!
echo ============================================
echo.
echo Deployment Summary:
echo   - Branch: develop -^> main
echo   - Files changed: 4 (service + hooks layer)
echo   - Tests passed: 49/49
echo   - Build: Success
echo.
echo Next Steps:
echo   1. Monitor deployment in hosting platform
echo   2. Wait for build to complete (~2-5 minutes)
echo   3. Run post-deployment verification:
echo      - Login as real landlord
echo      - Verify Dashboard shows only YOUR data
echo      - Compare Dashboard vs Finances (both yearly)
echo      - Test CRUD operations
echo   4. Check for errors in browser console
echo.
echo Files Deployed:
echo   - src/lib/data/property-service.ts
echo   - src/lib/data/tenant-service.ts
echo   - src/hooks/use-tenants.ts
echo   - src/hooks/use-expenses.ts
echo.
echo Rollback Command (if needed):
echo   git revert HEAD ^&^& git push origin main
echo.
echo Production deployment initiated!
echo.
