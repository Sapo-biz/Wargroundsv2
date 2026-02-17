#!/bin/bash
# Orbitron Setup Checklist

echo "=========================================="
echo "ORBITRON DEPLOYMENT CHECKLIST"
echo "=========================================="
echo ""

# Check Node
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node -v)"
else
    echo "❌ Node.js NOT found. Install from https://nodejs.org"
    exit 1
fi

# Check .env
if [ -f .env ]; then
    echo "✅ .env file exists"
    if grep -q "STRIPE_SECRET_KEY" .env; then
        echo "  ✅ STRIPE_SECRET_KEY set"
    else
        echo "  ❌ STRIPE_SECRET_KEY missing"
    fi
    if grep -q "STRIPE_PUBLISHABLE_KEY" .env; then
        echo "  ✅ STRIPE_PUBLISHABLE_KEY set"
    else
        echo "  ❌ STRIPE_PUBLISHABLE_KEY missing"
    fi
else
    echo "❌ .env file NOT found. Run: cp .env.example .env"
    echo "   Then edit .env with your Stripe keys"
fi

echo ""
echo "Required Environment Variables:"
echo "  • STRIPE_SECRET_KEY"
echo "  • STRIPE_PUBLISHABLE_KEY"
echo "  • STRIPE_PRICE_ID"
echo "  • STRIPE_WEBHOOK_SECRET"
echo ""

# Check files
echo "Checking files..."
FILES=("index.html" "style.css" "backend.js" "package.json")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file missing"
    fi
done

echo ""
echo "Next Steps:"
echo "1. npm install"
echo "2. Edit .env with your Stripe & Google keys"
echo "3. npm start (backend)"
echo "4. Open http://localhost:3000 (frontend)"
echo "5. Test Google login & Stripe"
echo ""
echo "For deployment, see DEPLOYMENT.md"
echo ""
