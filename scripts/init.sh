#!/bin/bash

set -e

echo "🚀 Initializing Quỹ Chung..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your Google OAuth credentials."
    echo ""
    echo "Required changes in .env:"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo "  - REACT_APP_GOOGLE_CLIENT_ID"
    echo ""
    echo "Get credentials from: https://console.cloud.google.com/apis/credentials"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Wait for PostgreSQL
echo "📦 Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U quychung > /dev/null 2>&1; do
    echo "   Still waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Geth
echo "⛓️  Waiting for Blockchain node..."
sleep 15
echo "✅ Blockchain node is ready"

# Wait for Backend
echo "🔧 Waiting for Backend..."
sleep 5
until curl -s http://localhost:8080/api/health > /dev/null 2>&1; do
    echo "   Still waiting for Backend..."
    sleep 2
done
echo "✅ Backend is ready"

echo ""
echo "🎉 Quỹ Chung is ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy smart contract:"
echo "      docker-compose exec backend sh -c 'cd /root && node scripts/deploy-contract.js'"
echo ""
echo "   2. Open your browser:"
echo "      http://localhost:3000"
echo ""
echo "📚 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""

# Generate frontend environment config
echo ""
echo "🔧 Setting up frontend environment..."
if [ -f .env ]; then
    ./scripts/generate-frontend-env.sh
else
    echo "⚠️  Skipping frontend env setup (no .env file)"
    echo "   Run './scripts/generate-frontend-env.sh' after creating .env"
fi
