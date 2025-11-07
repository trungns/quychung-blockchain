#!/bin/bash

echo "🔍 Checking OAuth Configuration..."
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

source .env

echo "1️⃣ Checking .env file:"
echo "   ✅ GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:30}..."
echo "   ✅ GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:10}..."
echo "   ✅ REACT_APP_GOOGLE_CLIENT_ID: ${REACT_APP_GOOGLE_CLIENT_ID:0:30}..."

if [ "$GOOGLE_CLIENT_ID" != "$REACT_APP_GOOGLE_CLIENT_ID" ]; then
    echo "   ⚠️  WARNING: GOOGLE_CLIENT_ID and REACT_APP_GOOGLE_CLIENT_ID are different!"
fi

echo ""
echo "2️⃣ Checking frontend env-config.js:"
if docker-compose ps frontend | grep -q "Up"; then
    FRONTEND_CONFIG=$(curl -s http://localhost:3000/env-config.js 2>/dev/null)
    if [ -n "$FRONTEND_CONFIG" ]; then
        echo "   ✅ File accessible"
        echo "$FRONTEND_CONFIG" | grep "REACT_APP_GOOGLE_CLIENT_ID" || echo "   ❌ Client ID not found in config!"
    else
        echo "   ❌ Cannot access env-config.js"
        echo "   Run: make setup-frontend"
    fi
else
    echo "   ⚠️  Frontend is not running"
fi

echo ""
echo "3️⃣ Services status:"
docker-compose ps

echo ""
echo "📋 Next steps if you see errors:"
echo ""
echo "If Client ID not in env-config.js:"
echo "   → Run: make setup-frontend"
echo ""
echo "If still getting 401 error:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials"
echo "   2. Click your OAuth 2.0 Client ID"
echo "   3. Add to 'Authorized JavaScript origins':"
echo "      http://localhost:3000"
echo "   4. Add to 'Authorized redirect URIs':"
echo "      http://localhost:3000"
echo "      http://localhost:3000/auth/callback"
echo "   5. Click Save"
echo "   6. Wait 30 seconds"
echo "   7. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo ""
echo "See QUICK_FIX_OAUTH.md for detailed guide"
