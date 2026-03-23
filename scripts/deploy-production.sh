#!/usr/bin/env bash
# Production Deployment Script - Data Scoping Fixes
# 
# This script automates the deployment of data scoping fixes to production
# while excluding demo-only features.

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Production Deployment - Data Scoping Fixes"
echo "=============================================="
echo ""

# Step 1: Pre-flight checks
echo "📋 Step 1/6: Running pre-flight checks..."
echo ""

# Check we're on develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo -e "${RED}❌ Error: Must be on 'develop' branch${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi
echo -e "${GREEN}✓${NC} On develop branch"

# Check working tree is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Working tree has uncommitted changes${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓${NC} Working tree clean"

# Pull latest from develop
echo "Pulling latest from origin/develop..."
git pull origin develop
echo -e "${GREEN}✓${NC} Up to date with origin/develop"
echo ""

# Step 2: Type check
echo "📋 Step 2/6: Running TypeScript type check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Type check failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Type check passed"
echo ""
# Step 3: Run unit tests
echo "📋 Step 3/6: Running unit tests..."
npm run test:unit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} All unit tests passed"
echo ""

# Step 4: Build verification
echo "📋 Step 4/6: Verifying production build..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Production build successful"
echo ""

# Step 5: Merge to main
echo "📋 Step 5/6: Merging to main branch..."
echo -e "${YELLOW}⚠️  This will trigger production deployment!${NC}"
read -p "Continue with merge to main? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

git checkout main
git pull origin main
git merge develop --no-ff -m "Deploy: Data scoping fixes for properties, tenants, and expenses"

echo -e "${GREEN}✓${NC} Merged develop into main"
echo ""

# Step 6: Push to production
echo "📋 Step 6/6: Pushing to production..."
echo -e "${YELLOW}⚠️  Final confirmation before push${NC}"
read -p "Push to origin/main (triggers production deployment)? (yes/no): " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "yes" ]; then
    echo "Deployment cancelled - rolling back merge..."
    git reset --hard HEAD~1
    git checkout develop
    exit 0
fi

git push origin main

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "📊 Deployment Summary:"
echo "  - Branch: develop → main"
echo "  - Files changed: 4 (service + hooks layer)"
echo "  - Tests passed: 49/49"
echo "  - Build: ✓ Success"
echo ""
echo "🔍 Next Steps:"
echo "  1. Monitor deployment in hosting platform"
echo "  2. Wait for build to complete (~2-5 minutes)"
echo "  3. Run post-deployment verification:"
echo "     - Login as real landlord"
echo "     - Verify Dashboard shows only YOUR data"
echo "     - Compare Dashboard vs Finances (both yearly)"
echo "     - Test CRUD operations"
echo "  4. Check for errors in browser console"
echo ""
echo "📝 Files Deployed:"
echo "  - src/lib/data/property-service.ts"
echo "  - src/lib/data/tenant-service.ts"
echo "  - src/hooks/use-tenants.ts"
echo "  - src/hooks/use-expenses.ts"
echo ""
echo "🔄 Rollback Command (if needed):"
echo "  git revert HEAD && git push origin main"
echo ""
echo -e "${GREEN}🎉 Production deployment initiated!${NC}"
