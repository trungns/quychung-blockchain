#!/bin/bash

echo "🔍 Verifying Quỹ Chung Installation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Docker Compose is not installed."
    exit 1
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  .env file not found. Run: cp .env.example .env"
fi

# Check if services are running
echo ""
echo "Checking services..."

services=("postgres" "geth" "backend" "frontend")
for service in "${services[@]}"; do
    echo -n "  $service: "
    if docker-compose ps $service | grep -q "Up"; then
        echo -e "${GREEN}Running${NC}"
    else
        echo -e "${RED}Not running${NC}"
    fi
done

# Check ports
echo ""
echo "Checking ports..."

ports=("3000:Frontend" "8080:Backend" "5432:PostgreSQL" "8545:Blockchain")
for port_service in "${ports[@]}"; do
    IFS=':' read -r port service <<< "$port_service"
    echo -n "  Port $port ($service): "
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}Open${NC}"
    else
        echo -e "${RED}Closed${NC}"
    fi
done

# Check contract deployment
echo ""
echo -n "Checking smart contract... "
if [ -f contracts/TreasuryLogger.json ]; then
    echo -e "${GREEN}✓ Deployed${NC}"
else
    echo -e "${YELLOW}⚠ Not deployed${NC}"
    echo "  Run: make deploy-contract"
fi

echo ""
echo "Verification complete!"
