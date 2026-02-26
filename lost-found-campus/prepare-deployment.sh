#!/bin/bash

# 🚀 Lost & Found Campus - Quick Deployment Helper
# This script helps prepare the code for deployment

echo "🦅 Lost & Found Campus - Deployment Preparation"
echo "=================================================="
echo ""

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit - Ready for deployment"
fi

# Verify .env is not committed
echo "📋 Checking if .env is protected..."
if git check-ignore backend/.env > /dev/null 2>&1; then
    echo "✅ .env is properly ignored"
else
    echo "⚠️  .env might be tracked. Adding to .gitignore..."
    echo ".env" >> backend/.gitignore
fi

# Check Node.js is installed
echo ""
echo "🔍 Checking environment..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Check npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --silent
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo ""
echo "✅ All dependencies installed"

# Summary
echo ""
echo "=================================================="
echo "✅ DEPLOYMENT PREPARATION COMPLETE"
echo "=================================================="
echo ""
echo "📝 Next Steps:"
echo "1. Copy backend/.env.example to backend/.env"
echo "2. Fill in your MongoDB, JWT_SECRET, and other configs"
echo "3. Push to GitHub: git push origin main"
echo "4. Follow DEPLOYMENT_CHECKLIST.md for Render/Vercel setup"
echo ""
echo "🚀 Quick deployment links:"
echo "   • Render: https://render.com"
echo "   • Vercel: https://vercel.com"
echo "   • MongoDB Atlas: https://www.mongodb.com/cloud/atlas"
echo ""

