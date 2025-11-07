#!/bin/bash

set -e

echo "🚀 Deploying contract to Hardhat node in Docker..."

# Wait for Hardhat node to be ready
echo "⏳ Waiting for Hardhat node to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker exec quychung-hardhat wget -q -O- http://127.0.0.1:8545 --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header='Content-Type: application/json' > /dev/null 2>&1; then
    echo "✅ Hardhat node is ready!"
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Hardhat node failed to start after $max_attempts attempts"
    exit 1
  fi

  echo "⏳ Attempt $attempt/$max_attempts - waiting..."
  sleep 2
done

# Deploy contract
echo "📝 Deploying TreasuryLogger contract..."
docker exec quychung-hardhat npx hardhat run scripts/deploy-hardhat.js --network localhost

echo "✨ Deployment completed!"
