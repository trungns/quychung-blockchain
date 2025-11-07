#!/bin/bash

set -e

echo "📦 Deploying Smart Contract (Using Docker)..."

# Check if Geth is running
if ! docker-compose ps geth | grep -q "Up"; then
    echo "❌ Geth blockchain is not running."
    echo "Please start services first: docker-compose up -d"
    exit 1
fi

echo "🚀 Deploying contract using Docker..."

# Run deployment in a Node.js container
docker run --rm \
    --network quychung_quychung-network \
    -v "$(pwd)/scripts:/app" \
    -v "$(pwd)/contracts:/contracts" \
    -w /app \
    -e BLOCKCHAIN_RPC=http://geth:8545 \
    node:18-alpine \
    sh -c "npm install && node deploy-dev-account.js"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Contract deployed successfully!"
    echo "📋 Contract info saved to: contracts/TreasuryLogger.json"
    echo ""
    echo "🔄 Restarting backend to pick up new contract..."
    docker-compose restart backend
    echo ""
    echo "✅ Done! You can now use the application at http://localhost:3000"
else
    echo "❌ Contract deployment failed"
    exit 1
fi
