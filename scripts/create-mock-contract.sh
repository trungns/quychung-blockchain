#!/bin/bash

echo "Creating mock contract deployment..."

# Create a fake contract address for development
MOCK_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Read the contract ABI from compiled Solidity
cat > contracts/TreasuryLogger.json << 'EOF'
{
  "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "treasury",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountToken",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isIncome",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "detailHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "loggedBy",
          "type": "address"
        }
      ],
      "name": "TransactionLogged",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_treasury",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amountToken",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_isIncome",
          "type": "bool"
        },
        {
          "internalType": "bytes32",
          "name": "_detailHash",
          "type": "bytes32"
        }
      ],
      "name": "logTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "logCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_treasury",
          "type": "address"
        }
      ],
      "name": "getTreasuryLogCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "deployedAt": "2025-01-07T00:00:00.000Z",
  "deployer": "0x0000000000000000000000000000000000000000",
  "note": "Mock contract for development - blockchain interaction disabled"
}
EOF

echo "✅ Mock contract created at contracts/TreasuryLogger.json"
echo "   Address: $MOCK_ADDRESS"
echo ""
echo "⚠️  Note: This is a mock deployment. Blockchain features will log errors but won't fail."
