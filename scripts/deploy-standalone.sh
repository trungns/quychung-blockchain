#!/bin/bash

set -e

echo "📦 Deploying Smart Contract (Standalone)..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed on your system."
    echo ""
    echo "Please install Node.js first:"
    echo "  - macOS: brew install node"
    echo "  - Ubuntu: sudo apt install nodejs npm"
    echo "  - Or download from: https://nodejs.org/"
    exit 1
fi

# Check if Geth is running
if ! docker-compose ps geth | grep -q "Up"; then
    echo "❌ Geth blockchain is not running."
    echo "Please start services first: docker-compose up -d"
    exit 1
fi

# Install dependencies if needed
if [ ! -d scripts/node_modules ]; then
    echo "📥 Installing dependencies..."
    cd scripts
    npm install
    cd ..
fi

# Deploy contract
echo "🚀 Deploying contract to blockchain..."
cd scripts
BLOCKCHAIN_RPC=http://localhost:8545 node deploy-contract.js
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Contract deployed successfully!"
    echo ""
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
