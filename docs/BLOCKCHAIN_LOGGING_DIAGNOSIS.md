# Blockchain Logging Diagnosis Guide

## Issue Description

On production (using Polygon Amoy), transactions stay in CONFIRMED status after treasurer approval and never progress to COMPLETED status.

## Root Cause Analysis

The transaction workflow has 3 stages:
1. **PENDING** → User creates transaction
2. **CONFIRMED** → Treasurer approves (synchronous DB update)
3. **COMPLETED** → Blockchain logging succeeds (asynchronous)

The issue occurs in the async goroutine that writes to blockchain. This goroutine runs after the confirm API returns, so any failures are silent unless properly logged.

## Fixes Implemented

### 1. Enhanced Logging in Transaction Handler
**File**: `backend/internal/api/transaction_handler.go`

Added comprehensive DEBUG/ERROR logs to the goroutine:
- Transaction details before blockchain call
- Blockchain service initialization status
- Success/failure of blockchain write
- Error details with type information

### 2. Enhanced Logging in Blockchain Service
**File**: `backend/internal/services/blockchain_service.go`

Added detailed logs for each step:
- Contract address and chain ID
- Network connection attempts (nonce, gas price)
- Transaction packing and signing
- Network send status

### 3. Database Schema Update
**File**: `backend/internal/database/migrations/006_add_chain_log_error_detail.sql`

Added `error_detail` column to `chain_logs` table to persist blockchain errors for debugging.

## How to Diagnose on Production

### Step 1: Reproduce the Issue
1. Login as a regular member
2. Create a new transaction (income or expense)
3. Login as treasurer/admin
4. Go to treasury detail page
5. Click "Xác nhận" (Confirm) on the pending transaction
6. Enter confirmed amount and submit
7. Observe transaction status stays "Đang xử lý" (CONFIRMED) instead of "Hoàn thành" (COMPLETED)

### Step 2: Check Logs
After reproducing, check production logs for these patterns:

#### Expected Success Flow:
```
DEBUG: ========== Starting blockchain logging for transaction <UUID> ==========
DEBUG: Treasury ID: <UUID>, Treasury Chain Address: <ADDRESS>
DEBUG: Transaction Type: INCOME, Confirmed Amount: 100.00
DEBUG: Blockchain service initialized successfully
DEBUG: Calling blockchain service LogTransaction...
BLOCKCHAIN: ========== LogTransaction START ==========
BLOCKCHAIN: Transaction ID: <UUID>
BLOCKCHAIN: Treasury Address: <ADDRESS>
BLOCKCHAIN: Contract Address: <ADDRESS>
BLOCKCHAIN: Chain ID: 80002  # For Polygon Amoy
BLOCKCHAIN: Getting nonce from network...
BLOCKCHAIN: Nonce: 123
BLOCKCHAIN: Getting gas price from network...
BLOCKCHAIN: Gas price: 1500000007 wei
BLOCKCHAIN: Signing transaction with EIP155...
BLOCKCHAIN: Sending transaction to network...
BLOCKCHAIN: ========== LogTransaction SUCCESS ==========
BLOCKCHAIN: TX Hash: 0x...
SUCCESS: ========== BLOCKCHAIN LOG COMPLETED ==========
SUCCESS: Transaction <UUID> marked as COMPLETED
```

#### Failure Patterns:

**Pattern 1: No logs at all**
- Goroutine not starting
- Possible cause: Panic before logging starts

**Pattern 2: Logs stop at "Blockchain service is NIL"**
```
DEBUG: ========== Starting blockchain logging for transaction <UUID> ==========
ERROR: Blockchain service is NIL for transaction <UUID>
```
- Blockchain service failed to initialize
- Check environment variables: `BLOCKCHAIN_RPC`, `TREASURY_PRIVATE_KEY`

**Pattern 3: Network connection failure**
```
BLOCKCHAIN: Getting nonce from network...
BLOCKCHAIN ERROR: Failed to get nonce: dial tcp: connection refused
BLOCKCHAIN ERROR: This usually means network connection failed
ERROR: ========== BLOCKCHAIN LOG FAILED ==========
```
- Cannot connect to Polygon Amoy RPC
- Check `BLOCKCHAIN_RPC` environment variable
- Verify RPC endpoint is accessible from production server

**Pattern 4: Contract not found**
```
BLOCKCHAIN: Contract Address: 0x0000000000000000000000000000000000000000
```
- Contract deployment info missing or invalid
- Check `contracts/TreasuryLogger.json` exists and has correct Polygon Amoy address

**Pattern 5: Transaction send failure**
```
BLOCKCHAIN: Sending transaction to network...
BLOCKCHAIN ERROR: Failed to send transaction to network: insufficient funds for gas * price + value
```
- Account doesn't have enough MATIC for gas
- Need to fund the account with Polygon Amoy testnet MATIC

### Step 3: Check Database
Query the `chain_logs` table to see error details:

```sql
SELECT cl.*, t.status as transaction_status
FROM chain_logs cl
JOIN transactions t ON t.id = cl.transaction_id
WHERE t.status = 'confirmed'
ORDER BY cl.created_at DESC;
```

If `error_detail` column has content, that's the blockchain error message.

## Environment Variables Checklist

Verify these are set correctly in production:

1. **BLOCKCHAIN_RPC**
   - For Polygon Amoy: `https://rpc-amoy.polygon.technology/`
   - Or use Alchemy/Infura endpoint

2. **TREASURY_PRIVATE_KEY**
   - Private key of account that will sign transactions
   - Must have MATIC balance for gas fees
   - Format: `0x...` or without prefix

3. **Contract Deployment**
   - `contracts/TreasuryLogger.json` must exist
   - Must contain Polygon Amoy contract address (not Hardhat local)
   - Format:
     ```json
     {
       "address": "0x...",
       "abi": [...]
     }
     ```

## Common Issues and Solutions

### Issue: Transaction stuck in CONFIRMED
**Diagnosis**: Check logs for error pattern
**Solution**: Based on error type:
- Network error → Fix RPC endpoint
- Insufficient funds → Fund account with MATIC
- Contract error → Verify contract deployment

### Issue: No blockchain logs appear
**Diagnosis**: Goroutine not starting
**Solution**: Check for panic in application logs

### Issue: "failed to get nonce" or "failed to get gas price"
**Diagnosis**: Cannot connect to blockchain network
**Solution**:
1. Verify BLOCKCHAIN_RPC is accessible
2. Test connection: `curl <BLOCKCHAIN_RPC>`
3. Check firewall rules

### Issue: Transaction keeps CONFIRMED status but no errors
**Diagnosis**: Goroutine hanging (network timeout)
**Solution**: Add context timeout to blockchain calls (future enhancement)

## Testing Locally

Before deploying to production, test with local Hardhat:

1. Ensure Hardhat is running: `docker-compose up hardhat`
2. Create and confirm transaction
3. Check logs show successful blockchain write
4. Verify transaction moves to COMPLETED status
5. Check `chain_logs` table has `tx_hash` and `detail_hash`

## Production Deployment Checklist

- [ ] Contract deployed to Polygon Amoy
- [ ] `contracts/TreasuryLogger.json` updated with Polygon Amoy address
- [ ] `BLOCKCHAIN_RPC` points to Polygon Amoy
- [ ] `TREASURY_PRIVATE_KEY` is set correctly
- [ ] Account has sufficient MATIC balance for gas
- [ ] Test transaction flow end-to-end
- [ ] Verify logs show success pattern
- [ ] Confirm transaction reaches COMPLETED status

## Next Steps

After deploying this fix:
1. Ask user to test transaction confirmation again
2. Request production logs showing the full flow
3. Check if transaction progresses to COMPLETED
4. If still failing, analyze specific error from logs
5. Take corrective action based on error type
