@echo off
cd /d "C:\Users\user\Documents\GitHub\uhome"
echo Checking if dist/ files are tracked in git...
git ls-files | findstr /B "dist/" 
if errorlevel 1 (
    echo [OK] No dist/ files are tracked in git
) else (
    echo [WARNING] dist/ files found in git tracking
)
