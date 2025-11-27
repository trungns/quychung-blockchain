# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-26

### 🎯 Major Changes - Blockchain Workflow Separation

This release separates business workflow from blockchain logging, treating blockchain as an optional verification layer rather than a required step for transaction completion.

**Commit:** a0fe3bb

### Added

#### Backend
- **BlockchainStatus enum** with states: none, pending, success, failed
- **Retry Blockchain API** endpoint: `POST /api/treasuries/:id/transactions/:txId/retry-blockchain`
  - Allows admin/treasurer to retry failed blockchain logging
  - Works for transactions with blockchain status "none" or "failed"
- **ChainLog.ErrorDetail** field to store blockchain error messages
- **ChainLog.UpdatedAt** field to track retry timestamps
- **Async blockchain logging** - runs in background without blocking transaction confirmation
- **Database indexes** for optimized queries on blockchain status

#### Smart Contract
- **Minimal TreasuryLogger contract** (32 lines, down from 93)
  - Only emits events, no storage
  - Gas usage: ~23,762 per transaction (90% reduction from ~250k)
  - Event-only architecture for verification

#### Frontend
- **BlockchainStatusBadge component** to display blockchain logging status
  - Visual indicators: ○ (none), ⟳ (pending), ⛓ (success), ⚠ (failed)
  - Color-coded: gray, blue, green, red
- **Retry Blockchain button** on TransactionList
  - Visible only to admin/treasurer
  - Shows for confirmed transactions with failed/none blockchain status
  - Loading state during retry
- **Blockchain status column** in transaction table
- **API function** `retryBlockchain(treasuryId, txId)`

#### Documentation
- **API_REFERENCE.md** - Complete API documentation for blockchain features
- **WORKFLOW_CHANGES_SUMMARY.md** - Updated with completion status
- **CHANGELOG.md** - Version history and migration guide

### Changed

#### Backend
- **Transaction workflow**: Confirm → Immediately "confirmed" (was: Confirm → Blockchain → "completed")
- **Balance calculation**: Uses "confirmed" status instead of "completed"
- **Report queries**: All updated to use "confirmed" status
- **Gas limit**: Reduced from 300k to 50k for blockchain transactions
- **Blockchain service**: Simplified to send only (treasury, detailHash)

#### Smart Contract
- **Removed all storage** (mappings, structs, counters)
- **Removed getter functions** (getTreasuryLogCount, etc.)
- **Parameters reduced** from 4 to 2: (treasury, detailHash)
- **Bytecode size**: ~7KB → ~1.5KB

#### Frontend
- **TransactionStatusBadge**: "completed" → removed, "confirmed" label changed to "Đã ghi sổ"
- **TransactionList**:
  - Added blockchain status display
  - Added action column with retry button
  - Display confirmed_amount instead of only amount_token
  - Mobile view updated with blockchain status
- **TreasuryDetail**: Passes treasuryId, userRole, onUpdate props to TransactionList

#### Database
- **Migration executed**: All "completed" transactions → "confirmed"
- **ChainLog statuses updated**: 'completed'/'confirmed' → 'success', 'error' → 'failed'

### Removed

#### Backend
- **TransactionStatusCompleted** enum constant
- **Blocking blockchain writes** from confirmation flow
- **Rollback on blockchain failure** (transactions stay confirmed)

#### Smart Contract
- **LogEntry struct**
- **logs mapping**
- **treasuryLogs mapping**
- **logCount counter**
- **getTreasuryLogCount function**
- **All storage writes** (SSTORE operations)

#### Frontend
- **"Completed" status badge** and label
- **Transaction hash display** in table (moved to blockchain status badge)

### Fixed
- **Production issue**: Transactions no longer stuck at "pending" due to insufficient gas
- **Balance calculation**: Now updates immediately when treasurer confirms
- **Report accuracy**: Uses confirmed transactions regardless of blockchain status
- **Gas costs**: Reduced by 90%, making blockchain logging affordable

### Migration Guide

#### Database Migration
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

#### Deployment Steps
1. Pull latest code: `git pull origin main`
2. Stop services: `docker-compose down`
3. Build new images: `docker-compose build app`
4. Start services: `docker-compose up -d`
5. Verify: `docker logs quychung-app --tail 50`

### Performance Improvements
- **Gas usage**: 250,000 → 23,762 (90% reduction)
- **Transaction confirmation**: Immediate (was: blocked by blockchain)
- **Balance updates**: Real-time (was: after blockchain confirmation)
- **Contract size**: 93 lines → 32 lines (65% reduction)
- **Bytecode**: ~7KB → ~1.5KB (79% reduction)

### Breaking Changes
- ⚠️ **API Response**: Transaction status no longer includes "completed"
- ⚠️ **Frontend**: Components expecting "completed" status will need updates
- ⚠️ **Smart Contract**: Incompatible with previous version (new ABI)
- ⚠️ **Database**: Migration required for existing data

### Dependencies
No new dependencies added.

---

## [1.1.0] - 2025-11-20

### Added
- Member role management for admin users
- Role-based permissions system
- Transaction workflow with approval system
- Treasurer bank account info display
- Auto-migration system for database

### Changed
- Updated authentication flow
- Improved balance calculation logic

### Fixed
- Critical fixes for balance calculation
- Role-based access control issues

---

## [1.0.0] - 2025-11-17

### Added
- Initial release
- Treasury management system
- Transaction tracking (income/expense)
- Blockchain logging with TreasuryLogger smart contract
- User authentication with Google OAuth
- Real-time balance calculation
- Monthly/yearly reports
- Docker deployment setup

### Features
- Multi-user treasury management
- Transaction approval workflow
- On-chain transaction logging
- Responsive web interface
- PostgreSQL database
- Hardhat local blockchain

---

## Legend

- 🎯 Major feature or change
- ✨ New feature
- 🔧 Enhancement
- 🐛 Bug fix
- ⚠️ Breaking change
- 📚 Documentation
- 🚀 Performance improvement
- 🔒 Security fix
