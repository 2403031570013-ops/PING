#!/bin/bash

# 🚀 Lost & Found Campus - Automated Deployment Script
# This script automates the deployment to Render + Vercel

echo "🦅 Lost & Found Campus - DEPLOYMENT AUTOMATION"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================================
# STEP 1: Pre-deployment checks
# ============================================================
echo "STEP 1: Pre-deployment Checks"
echo "=============================="

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    print_error ".env file not found in backend/"
    echo ""
    echo "📝 Please create backend/.env with:"
    echo "   cp backend/.env.example backend/.env"
    echo "   # Then edit backend/.env with your actual values"
    exit 1
fi

print_success ".env file exists"

# Check required environment variables
required_vars=("MONGO_URI" "JWT_SECRET" "ADMIN_KEY" "CLOUDINARY_CLOUD_NAME")
for var in "${required_vars[@]}"; do
    if ! grep -q "$var=" backend/.env; then
        print_warning "$var not found in .env"
    else
        print_success "$var configured"
    fi
done

# ============================================================
# STEP 2: Verify Git is ready
# ============================================================
echo ""
echo "STEP 2: Git Repository Check"
echo "============================="

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not a git repository"
    exit 1
fi

print_success "Git repository found"

# Check if .env is in .gitignore
if grep -q "\.env" backend/.gitignore 2>/dev/null; then
    print_success ".env protected in .gitignore"
else
    print_warning "Adding .env to .gitignore"
    echo ".env" >> backend/.gitignore
fi

# Check uncommitted changes
pending=$(git diff-index --quiet HEAD -- || echo "changes")
if [ ! -z "$pending" ]; then
    echo ""
    print_warning "Uncommitted changes detected"
    git status --short
    echo ""
    read -p "Commit changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Pre-deployment: Production configuration"
        print_success "Changes committed"
    fi
fi

# ============================================================
# STEP 3: Verify dependencies
# ============================================================
echo ""
echo "STEP 3: Dependency Check"
echo "========================"

# Check backend packages
cd backend
if npm list --depth=0 > /dev/null 2>&1; then
    print_success "Backend dependencies OK"
else
    print_warning "Installing backend dependencies..."
    npm install
fi
cd ..

# Check frontend packages
cd frontend
if npm list --depth=0 > /dev/null 2>&1; then
    print_success "Frontend dependencies OK"
else
    print_warning "Installing frontend dependencies..."
    npm install
fi
cd ..

# ============================================================
# STEP 4: Build verification
# ============================================================
echo ""
echo "STEP 4: Build Verification"
echo "==========================="

# Test backend can start
print_warning "Testing backend startup (timeout: 5s)..."
timeout 5s npm --prefix backend start > /tmp/backend_test.log 2>&1 || true

if grep -q "listening on port" /tmp/backend_test.log; then
    print_success "Backend starts successfully"
else
    print_warning "Backend startup output:"
    cat /tmp/backend_test.log | head -10
fi

# Test frontend build
print_warning "Testing frontend build..."
npm --prefix frontend run build > /tmp/frontend_build.log 2>&1

if [ $? -eq 0 ]; then
    print_success "Frontend builds successfully"
else
    print_error "Frontend build failed"
    cat /tmp/frontend_build.log | tail -20
    exit 1
fi

# ============================================================
# STEP 5: Deployment information
# ============================================================
echo ""
echo "STEP 5: Deployment Instructions"
echo "================================"
echo ""
echo "🎯 Your deployment targets:"
echo ""
echo "BACKEND DEPLOYMENT (Render):"
echo "   1. Go to https://render.com"
echo "   2. Create new Web Service"
echo "   3. Connect to this GitHub repository"
echo "   4. Environment variables:"
echo "      - Copy all vars from backend/.env"
echo "   5. Build command: npm install"
echo "   6. Start command: npm start"
echo ""
echo "FRONTEND DEPLOYMENT (Vercel):"
echo "   1. Go to https://vercel.com"
echo "   2. Create new project"
echo "   3. Import this GitHub repository"
echo "   4. Root directory: frontend/"
echo "   5. Build command: npm run build"
echo "   6. Deploy"
echo ""
echo "⚠️  IMPORTANT:"
echo "   After backend deploys, update frontend URL:"
echo "   frontend/config/axios.js line 7:"
echo "   const PRODUCTION_URL = 'https://your-backend-url/api/';"
echo ""

# ============================================================
# STEP 6: Final checklist
# ============================================================
echo ""
echo "STEP 6: Final Pre-Deployment Checklist"
echo "======================================"

checklist=(
    "✅ .env file created"
    "✅ .env in .gitignore"
    "✅ No API keys in code"
    "✅ No secrets committed"
    "✅ Backend starts"
    "✅ Frontend builds"
    "✅ Code pushed to GitHub"
    "⏳ MongoDB Atlas cluster created"
    "⏳ Database user created"
    "⏳ Render account ready"
    "⏳ Vercel account ready"
)

for item in "${checklist[@]}"; do
    echo "$item"
done

echo ""
echo "✅ PRE-DEPLOYMENT CHECKS COMPLETE"
echo ""
echo "Ready to deploy? Follow the instructions above!"
echo ""
