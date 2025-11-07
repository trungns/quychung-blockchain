#!/bin/bash

set -e

echo "⚠️  WARNING: This will delete all data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo "🛑 Stopping all services..."
docker-compose down -v

echo "🗑️  Removing volumes..."
docker volume rm quychung_postgres_data 2>/dev/null || true
docker volume rm quychung_geth_data 2>/dev/null || true

echo "🧹 Cleaning up..."
rm -f contracts/TreasuryLogger.json 2>/dev/null || true

echo "✅ Reset complete!"
echo ""
echo "To start fresh:"
echo "   ./scripts/init.sh"
