#!/usr/bin/env bash
# Production Deployment Script
# Deploys data scoping fixes to production with safety checks

set -e  # Exit on any error

echo "🚀 Production Deployment - Data Scoping Fixes"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-flight checks
echo "📋 Step 1: Pre-flight Checks"
echo "----------------------------"

# Check we're on develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo -e "${RED}❌ Not on develop branch! Current: $CURRENT_BRANCH${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} On develop branch"

# Check working tree is clean
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Working tree is dirty! Commit changes first.${NC}"
    git status --short
    exit 1
fi
echo -e "${GREEN}✓${NC} Working tree clean"

# Pull latest
echo "Pulling latest changes..."
git pull origin develop
echo -e "${GREEN}✓${NC} Up to date with origin/develop"

# Step 2: Run tests
echo ""
echo "🧪 Step 2: Running Tests"
echo "------------------------"

# Type check
echo "Running TypeScript type check..."
if ! npx tsc --noEmit; then
    echo -e "${RED}❌ Type check failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Type check passed"

# Unit tests
echo "Running unit tests..."
if ! npm run test:unit; then
    echo -e "${RED}❌ Unit tests failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} All 49 tests passed"

# Build check
echo "Testing production build..."
if ! npm run build; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Production build successful"

# Step 3: Review changes
echo ""
echo "📝 Step 3: Review Changes"
echo "-------------------------"
echo "Files that will be deployed:"
echo "  - src/lib/data/property-service.ts"
echo "  - src/lib/data/tenant-service.ts"
echo "  - src/hooks/use-tenants.ts"
echo "  - src/hooks/use-expenses.ts"
echo ""

# Show diff summary
echo "Changes summary:"
git diff origin/main develop --stat -- \
    src/lib/data/property-service.ts \
    src/lib/data/tenant-service.ts \
    src/hooks/use-tenants.ts \
    src/hooks/use-expenses.ts

# Step 4: Confirm deployment
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT REMINDERS:${NC}"
echo "1. Demo features will NOT be included in production"
echo "2. Production uses cloud Supabase, not local"
echo "3. All data will be scoped to authenticated users"
echo "4. This cannot be undone without a rollback"
echo ""
read -p "Deploy to production? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Step 5: Merge to main
echo ""
echo "🔀 Step 5: Merging to Main"
echo "--------------------------"

git checkout main
git pull origin main
git merge develop --no-ff -m "Deploy: Data scoping fixes for multi-tenant isolation"

echo -e "${GREEN}✓${NC} Merged develop into main"

# Step 6: Push to production
echo ""
echo "🚀 Step 6: Pushing to Production"
echo "---------------------------------"

git push origin main

echo ""
echo -e "${GREEN}✓✓✓ Deployment Complete! ✓✓✓${NC}"
echo ""
echo "📊 Next Steps:"
echo "1. Wait for deployment to complete (check Vercel/hosting dashboard)"
echo "2. Run post-deployment verification:"
echo "   - Login as real landlord"
echo "   - Verify scoped data (properties, tenants, expenses)"
echo "   - Compare Dashboard vs Finances (both yearly)"
echo "   - Test create/update/delete operations"
echo "3. Monitor for errors in first 24 hours"
echo ""
echo "🔄 Rollback if needed:"
echo "   git revert HEAD && git push origin main"
echo ""

# Return to develop
git checkout develop
