#!/bin/bash

set -e

echo "🔄 Rebuilding frontend with environment variables..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env from .env.example and add your Google OAuth credentials"
    exit 1
fi

# Load env vars
source .env

# Check if REACT_APP_GOOGLE_CLIENT_ID is set
if [ -z "$REACT_APP_GOOGLE_CLIENT_ID" ]; then
    echo "❌ REACT_APP_GOOGLE_CLIENT_ID is not set in .env"
    echo "Please add it to .env file"
    exit 1
fi

echo "✅ Found REACT_APP_GOOGLE_CLIENT_ID: ${REACT_APP_GOOGLE_CLIENT_ID:0:20}..."

# Rebuild frontend container
echo "🔨 Rebuilding frontend..."
docker-compose build --no-cache frontend

echo "🔄 Restarting frontend..."
docker-compose up -d frontend

echo ""
echo "✅ Frontend rebuilt successfully!"
echo "📱 Open http://localhost:3000 to test"
