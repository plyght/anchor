#!/bin/bash
set -e

echo "🚀 Setting up Anchor project..."

# Check Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun 1.0+ from https://bun.sh"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"

# Step 1: Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
bun install

# Step 2: Setup Convex
echo ""
echo "🔷 Setting up Convex..."
echo "   Run 'bunx convex dev' to initialize Convex (this will create .env.local)"
echo "   After Convex is initialized, run this script again with --convex flag"
if [ "$1" = "--convex" ]; then
    if [ -f ".env.local" ]; then
        CONVEX_URL=$(grep CONVEX_URL .env.local | cut -d '=' -f2)
        echo "✅ Found CONVEX_URL in .env.local"
    else
        echo "⚠️  .env.local not found. Please run 'bunx convex dev' first"
        exit 1
    fi
fi

# Step 3: Setup Frontend
echo ""
echo "🎨 Setting up frontend..."
cd frontend
bun install

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created frontend/.env from .env.example"
    
    if [ "$1" = "--convex" ] && [ -n "$CONVEX_URL" ]; then
        echo "VITE_CONVEX_URL=$CONVEX_URL" >> .env
        echo "✅ Added VITE_CONVEX_URL to frontend/.env"
    else
        echo "⚠️  Please add VITE_CONVEX_URL to frontend/.env manually"
        echo "   Copy CONVEX_URL from .env.local after running 'bunx convex dev'"
    fi
else
    echo "✅ frontend/.env already exists"
fi

cd ..

# Step 4: Setup Backend
echo ""
echo "⚙️  Setting up backend..."
cd backend
bun install

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created backend/.env from .env.example"
    echo ""
    echo "⚠️  Please edit backend/.env and set:"
    echo "   - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "   - Other values as needed"
else
    echo "✅ backend/.env already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'bunx convex dev' to initialize Convex (if not done)"
echo "2. Run this script again with --convex flag to auto-configure frontend"
echo "3. Edit backend/.env with your configuration"
echo "4. Start development servers:"
echo "   Terminal 1: bunx convex dev"
echo "   Terminal 2: cd frontend && bun dev"
echo "   Terminal 3: cd backend && bun run src/index.ts"
