#!/bin/bash

set -e

echo "📦 Deploying Smart Contract..."

# Check if backend is running
if ! docker-compose ps backend | grep -q "Up"; then
    echo "❌ Backend is not running. Please start services first:"
    echo "   docker-compose up -d"
    exit 1
fi

# Check if contract deployment script exists
if [ ! -f scripts/deploy-contract.js ]; then
    echo "❌ Deploy script not found: scripts/deploy-contract.js"
    exit 1
fi

# Install dependencies if needed
echo "📥 Installing dependencies..."
docker-compose exec -T backend sh -c "
    if [ ! -d node_modules ]; then
        npm install --save web3 solc
    fi
"

# Deploy contract
echo "🚀 Deploying contract to blockchain..."
docker-compose exec -T backend sh -c "cd /root && node scripts/deploy-contract.js"

if [ $? -eq 0 ]; then
    echo "✅ Contract deployed successfully!"
    echo ""
    echo "Contract info saved to: contracts/TreasuryLogger.json"
else
    echo "❌ Contract deployment failed"
    exit 1
fi
