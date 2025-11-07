#!/bin/bash

set -e

echo "🔧 Generating frontend environment config..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Load .env
source .env

# Check required vars
if [ -z "$REACT_APP_GOOGLE_CLIENT_ID" ]; then
    echo "❌ REACT_APP_GOOGLE_CLIENT_ID not found in .env"
    exit 1
fi

# Create env-config.js
cat > frontend/public/env-config.js << ENVEOF
window.ENV = {
  REACT_APP_API_URL: '${REACT_APP_API_URL:-http://localhost:8080}',
  REACT_APP_GOOGLE_CLIENT_ID: '${REACT_APP_GOOGLE_CLIENT_ID}'
};
ENVEOF

echo "✅ Created frontend/public/env-config.js"
echo "   REACT_APP_GOOGLE_CLIENT_ID: ${REACT_APP_GOOGLE_CLIENT_ID:0:30}..."

# Copy to container and restart
if docker-compose ps frontend | grep -q "Up"; then
    echo "📦 Copying to container..."
    docker cp frontend/public/env-config.js quychung-frontend:/usr/share/nginx/html/env-config.js

    echo "🔄 Restarting frontend..."
    docker-compose restart frontend > /dev/null 2>&1
    echo "✅ Frontend restarted"
fi

echo ""
echo "✅ Done! Open http://localhost:3000 and try to login"
echo "   (Hard refresh with Cmd+Shift+R or Ctrl+Shift+R if needed)"
