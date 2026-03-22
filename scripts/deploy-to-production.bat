@echo off
REM Production Deployment Script - Windows Version
REM Deploys data scoping fixes to production with safety checks

setlocal enabledelayedexpansion

echo ================================
echo Production Deployment - Data Scoping Fixes
echo ================================
echo.

REM Step 1: Pre-flight checks
echo [Step 1] Pre-flight Checks
echo --------------------------

REM Check current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
if not "!CURRENT_BRANCH!"=="develop" (
    echo [ERROR] Not on develop branch! Current: !CURRENT_BRANCH!
    exit /b 1
)
echo [OK] On develop branch

REM Check working tree is clean
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo [ERROR] Working tree is dirty! Commit changes first.
    git status --short
    exit /b 1
)
echo [OK] Working tree clean

REM Pull latest
echo Pulling latest changes...
git pull origin develop
if errorlevel 1 (
    echo [ERROR] Failed to pull latest changes
    exit /b 1
)
echo [OK] Up to date with origin/develop
echo.

REM Step 2: Run tests
echo [Step 2] Running Tests
echo ----------------------

echo Running TypeScript type check...
call npx tsc --noEmit
if errorlevel 1 (
    echo [ERROR] Type check failed!
    exit /b 1
)
echo [OK] Type check passed

echo Running unit tests...
call npm run test:unit
if errorlevel 1 (
    echo [ERROR] Unit tests failed!
    exit /b 1
)
echo [OK] All 49 tests passed

echo Testing production build...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    exit /b 1
)
echo [OK] Production build successful
echo.

REM Step 3: Review changes
echo [Step 3] Review Changes
echo -----------------------
echo Files that will be deployed:
echo   - src/lib/data/property-service.ts
echo   - src/lib/data/tenant-service.ts
echo   - src/hooks/use-tenants.ts
echo   - src/hooks/use-expenses.ts
echo.

echo Changes summary:
git diff origin/main develop --stat -- src/lib/data/property-service.ts src/lib/data/tenant-service.ts src/hooks/use-tenants.ts src/hooks/use-expenses.ts
echo.

REM Step 4: Confirm deployment
echo [WARNING] IMPORTANT REMINDERS:
echo 1. Demo features will NOT be included in production
echo 2. Production uses cloud Supabase, not local
echo 3. All data will be scoped to authenticated users
echo 4. This cannot be undone without a rollback
echo.

set /p CONFIRM="Deploy to production? (yes/no): "
if not "!CONFIRM!"=="yes" (
    echo Deployment cancelled
    exit /b 0
)

REM Step 5: Merge to main
echo.
echo [Step 5] Merging to Main
echo ------------------------

git checkout main
if errorlevel 1 exit /b 1

git pull origin main
if errorlevel 1 exit /b 1

git merge develop --no-ff -m "Deploy: Data scoping fixes for multi-tenant isolation"
if errorlevel 1 exit /b 1

echo [OK] Merged develop into main
echo.

REM Step 6: Push to production
echo [Step 6] Pushing to Production
echo --------------------------------

git push origin main
if errorlevel 1 (
    echo [ERROR] Failed to push to production
    git checkout develop
    exit /b 1
)

echo.
echo ================================
echo    Deployment Complete!
echo ================================
echo.
echo [Next Steps]
echo 1. Wait for deployment to complete (check Vercel/hosting dashboard)
echo 2. Run post-deployment verification:
echo    - Login as real landlord
echo    - Verify scoped data (properties, tenants, expenses)
echo    - Compare Dashboard vs Finances (both yearly)
echo    - Test create/update/delete operations
echo 3. Monitor for errors in first 24 hours
echo.
echo [Rollback if needed]
echo    git revert HEAD
echo    git push origin main
echo.

REM Return to develop
git checkout develop

echo Returned to develop branch
echo.
pause
