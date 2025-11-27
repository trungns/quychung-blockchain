# API Reference - Blockchain & Transaction Management

## Overview
This document covers the blockchain-related and transaction management APIs.

Last updated: 2025-11-26 (commit: a0fe3bb)

---

## Transaction APIs

### Confirm Transaction
Confirms a pending transaction. The transaction becomes "confirmed" immediately and is counted in balance/reports. Blockchain logging happens asynchronously.

**Endpoint:** `POST /api/treasuries/:id/transactions/:txId/confirm`

**Authentication:** Required (JWT)

**Authorization:** Admin or Treasurer only

**Request Body:**
```json
{
  "confirmed_amount": 100000
}
```

**Response:**
```json
{
  "id": "uuid",
  "treasury_id": "uuid",
  "type": "INCOME",
  "amount_token": 100000,
  "confirmed_amount": 100000,
  "status": "confirmed",
  "chain_log": {
    "id": "uuid",
    "transaction_id": "uuid",
    "status": "none",
    "created_at": "2025-11-26T10:00:00Z"
  },
  "created_at": "2025-11-26T09:00:00Z",
  "updated_at": "2025-11-26T10:00:00Z"
}
```

**Notes:**
- Transaction status changes to "confirmed" immediately
- ChainLog is created with status "none"
- Blockchain logging runs in background (async)
- If blockchain fails, transaction remains "confirmed"
- Balance and reports are updated immediately

---

### Retry Blockchain Logging
Retries blockchain logging for a confirmed transaction that failed or hasn't been logged yet.

**Endpoint:** `POST /api/treasuries/:id/transactions/:txId/retry-blockchain`

**Authentication:** Required (JWT)

**Authorization:** Admin or Treasurer only

**Request Body:** None

**Response:**
```json
{
  "message": "Blockchain logging retry initiated",
  "transaction_id": "uuid",
  "chain_log_status": "pending"
}
```

**Conditions:**
- Transaction must have status "confirmed"
- ChainLog status must be "none" or "failed"
- Only admin or treasurer can retry

**Use Cases:**
- Insufficient gas when first logged
- Network timeout during blockchain write
- Contract not deployed when transaction confirmed
- Manual retry after fixing blockchain issues

**Error Responses:**
```json
// 403 Forbidden - Not authorized
{
  "error": "Only admin or treasurer can retry blockchain logging"
}

// 400 Bad Request - Invalid state
{
  "error": "Can only retry blockchain logging for confirmed transactions"
}

// 400 Bad Request - Already logged
{
  "error": "Blockchain already logged successfully"
}
```

---

## Blockchain Status

### BlockchainStatus Enum
```go
const (
    BlockchainStatusNone    = "none"    // Not yet logged to blockchain
    BlockchainStatusPending = "pending" // Currently logging to blockchain
    BlockchainStatusSuccess = "success" // Successfully logged
    BlockchainStatusFailed  = "failed"  // Failed (can retry)
)
```

### ChainLog Object
```json
{
  "id": "uuid",
  "transaction_id": "uuid",
  "tx_hash": "0x...",
  "detail_hash": "0x...",
  "block_number": 12345,
  "status": "success",
  "error_detail": "",
  "created_at": "2025-11-26T10:00:00Z",
  "updated_at": "2025-11-26T10:00:30Z"
}
```

**Fields:**
- `tx_hash`: Ethereum transaction hash (66 chars)
- `detail_hash`: Hash of transaction data for verification
- `block_number`: Block number where transaction was mined
- `status`: Current blockchain logging status
- `error_detail`: Error message if status is "failed"

---

## Transaction Status

### TransactionStatus Enum
```go
const (
    TransactionStatusPending   = "pending"   // Awaiting treasurer confirmation
    TransactionStatusConfirmed = "confirmed" // Recorded in ledger, counted in balance
    TransactionStatusRejected  = "rejected"  // Rejected by treasurer
    TransactionStatusDeleted   = "deleted"   // Soft deleted
)
```

**Note:** The "completed" status has been removed. Transactions are now "confirmed" immediately when treasurer approves.

---

## Workflow Diagram

```
User creates transaction → PENDING
                              ↓
Treasurer confirms → CONFIRMED (balance updated immediately)
                              ↓
                     ChainLog created (status: none)
                              ↓
                     Blockchain logging (async)
                              ↓
                   ┌──────────┴──────────┐
                   ↓                     ↓
            Success (status: success)  Failed (status: failed)
                                            ↓
                                      Can retry anytime
```

---

## Smart Contract

### TreasuryLogger Contract

**Address:** (Deploy per network)

**ABI:**
```json
[
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "treasury",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "detailHash",
        "type": "bytes32"
      }
    ],
    "name": "TransactionLogged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "name": "_treasury",
        "type": "address"
      },
      {
        "name": "_detailHash",
        "type": "bytes32"
      }
    ],
    "name": "logTransaction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

**Gas Usage:**
- `logTransaction()`: ~23,762 gas (measured)
- Only emits events, no storage writes
- 90% gas savings vs previous version

**Event Structure:**
```solidity
event TransactionLogged(
    address indexed treasury,
    bytes32 indexed detailHash
);
```

---

## Frontend Integration

### Transaction List Component

**Props:**
```typescript
interface TransactionListProps {
  transactions: Transaction[];
  treasuryId: string;
  userRole: 'admin' | 'treasurer' | 'member';
  onUpdate: () => void;
}
```

**Features:**
- Display blockchain status badge separately from transaction status
- Show "Retry Blockchain" button for failed/none blockchain status
- Only admin/treasurer can see retry button
- Visual indicators for blockchain logging status

### API Service

```javascript
// frontend/src/services/api.js
export const transactionAPI = {
  confirm: (treasuryId, txId, data) =>
    api.post(`/treasuries/${treasuryId}/transactions/${txId}/confirm`, data),

  retryBlockchain: (treasuryId, txId) =>
    api.post(`/treasuries/${treasuryId}/transactions/${txId}/retry-blockchain`),
};
```

---

## Migration Guide

### From Old to New Workflow

**Database Migration:**
```sql
-- Update transaction status
UPDATE transactions SET status = 'confirmed' WHERE status = 'completed';

-- Update chain_logs status
UPDATE chain_logs SET status = 'success' WHERE status IN ('completed', 'confirmed');
UPDATE chain_logs SET status = 'failed' WHERE status = 'error';
UPDATE chain_logs SET status = 'none' WHERE status IS NULL OR status = '';

-- Add indexes
CREATE INDEX idx_chain_logs_status_failed ON chain_logs(status) WHERE status = 'failed';
CREATE INDEX idx_transactions_confirmed ON transactions(status) WHERE status = 'confirmed';
```

**Backend Code:**
- Replace all queries checking `status = 'completed'` with `status = 'confirmed'`
- Update balance calculations to use confirmed transactions
- Update report queries to use confirmed status

**Frontend Code:**
- Remove "Completed" status badge
- Add "Blockchain Status" column
- Implement retry blockchain button

---

## Best Practices

1. **Transaction Confirmation:**
   - Always confirm transactions promptly
   - Blockchain logging can happen later
   - Balance is updated immediately on confirmation

2. **Blockchain Retry:**
   - Monitor ChainLog status for failures
   - Retry when gas is available
   - Check error_detail for failure reason

3. **Error Handling:**
   - Blockchain failures don't affect ledger
   - Retry mechanism allows eventual consistency
   - Keep transaction confirmed even if blockchain fails

4. **Gas Management:**
   - Ensure sufficient gas before confirming
   - Monitor gas prices
   - Retry during low gas periods if needed

---

## Troubleshooting

### Transaction confirmed but blockchain failed

**Check:**
```bash
# Check chain_log status
SELECT * FROM chain_logs WHERE transaction_id = 'uuid';

# Check error detail
SELECT error_detail FROM chain_logs WHERE transaction_id = 'uuid';
```

**Solutions:**
1. Check gas balance in blockchain wallet
2. Verify contract is deployed
3. Check network connectivity
4. Use retry blockchain API

### Retry blockchain returns error

**Common errors:**
- "Only admin or treasurer can retry": Check user role
- "Can only retry for confirmed transactions": Transaction must be confirmed first
- "Blockchain already logged successfully": No need to retry, already done

---

## Version History

### v2.0.0 (2025-11-26) - commit: a0fe3bb
- Separated business workflow from blockchain logging
- Removed "completed" status
- Added BlockchainStatus enum
- Implemented retry blockchain API
- Optimized smart contract (90% gas reduction)
- Updated frontend UI with blockchain status display

### v1.0.0 (Previous)
- Original implementation
- Transaction status: pending → confirmed → completed
- Blockchain logging blocked transaction completion
