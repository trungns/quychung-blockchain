# Tóm tắt thay đổi luồng nghiệp vụ - Ngày 26/11/2025

## 🎯 Mục tiêu
Tách biệt luồng nghiệp vụ quản lý quỹ và ghi blockchain để:
- **Thủ quỹ confirm = GHI VÀO SỔ** → tính balance/report ngay lập tức
- **Blockchain logging = THÔNG BÁO** → chỉ để kiểm chứng, không ảnh hưởng nghiệp vụ
- **Cho phép retry** blockchain khi thất bại (do không đủ gas, network issue...)

---

## 🔧 Thay đổi chính

### 1. Model & Database Changes

#### a) Xóa status `completed` cho Transaction
**Trước:**
```go
TransactionStatusCompleted TransactionStatus = "completed"
```

**Sau:** Xóa hoàn toàn, chỉ giữ:
```go
TransactionStatusPending   = "pending"   // Chờ thủ quỹ xác nhận
TransactionStatusConfirmed = "confirmed" // ĐÃ GHI VÀO SỔ, tính balance
TransactionStatusRejected  = "rejected"  // Bị từ chối
TransactionStatusDeleted   = "deleted"   // Đã xóa
```

#### b) Thêm BlockchainStatus riêng biệt
```go
type BlockchainStatus string

const (
	BlockchainStatusNone    = "none"    // Chưa ghi blockchain
	BlockchainStatusPending = "pending" // Đang ghi lên blockchain
	BlockchainStatusSuccess = "success" // Đã ghi thành công
	BlockchainStatusFailed  = "failed"  // Ghi thất bại (có thể retry)
)
```

#### c) Cập nhật ChainLog model
```go
type ChainLog struct {
	ID            uuid.UUID
	TransactionID uuid.UUID
	TxHash        string
	DetailHash    string
	BlockNumber   int64
	Status        BlockchainStatus // Dùng BlockchainStatus thay vì string
	ErrorDetail   string           // Lưu lỗi khi fail
	CreatedAt     time.Time
	UpdatedAt     time.Time        // Thêm để track khi retry
	Transaction   Transaction
}
```

#### d) Database Migration
```sql
-- Chuyển status 'completed' → 'confirmed'
UPDATE transactions SET status = 'confirmed' WHERE status = 'completed';

-- Cập nhật chain_logs status
UPDATE chain_logs SET status = 'success' WHERE status IN ('completed', 'confirmed');
UPDATE chain_logs SET status = 'failed' WHERE status = 'error';
UPDATE chain_logs SET status = 'none' WHERE status IS NULL OR status = '';

-- Thêm indexes
CREATE INDEX idx_chain_logs_status_failed ON chain_logs(status) WHERE status = 'failed';
CREATE INDEX idx_transactions_confirmed ON transactions(status) WHERE status = 'confirmed';
```

---

### 2. Business Logic Changes

#### a) ConfirmTransaction Flow (transaction_handler.go:132)
**Luồng MỚI:**
1. Thủ quỹ confirm → Transaction chuyển thành `confirmed` **NGAY LẬP TỨC**
2. Tạo ChainLog với status = `none`
3. **Commit DB ngay** → Balance/report đã tính được
4. Gọi blockchain logging **async, non-blocking**
5. Nếu blockchain fail → Chỉ update ChainLog.status = `failed`, **KHÔNG rollback** transaction

**Code:**
```go
// IMPORTANT: Transaction is now CONFIRMED (already counted in balance/reports)
// Blockchain logging is separate and async - just for verification

chainLog := models.ChainLog{
	ID:            uuid.New(),
	TransactionID: transaction.ID,
	Status:        models.BlockchainStatusNone,
}
tx.Create(&chainLog)
tx.Commit() // Commit ngay, không chờ blockchain

// Try log to blockchain (async, non-blocking)
go h.logTransactionToBlockchain(&transaction, &chainLog, &treasury, req.ConfirmedAmount)
```

#### b) Balance Calculation (treasury_handler.go:320)
**Trước:** Chỉ tính transaction có status = `completed`
```go
Where("... AND status IN ?", []string{"completed"})
```

**Sau:** Tính transaction có status = `confirmed`
```go
Where("... AND status = ?", models.TransactionStatusConfirmed)
```

#### c) Reports (report_handler.go)
Tất cả queries đổi từ `status = 'completed'` → `status = 'confirmed'`:
- GetMonthlyIncomeByMember
- GetMonthlyExpense
- GetYearlySummary
- GetTopContributors

---

### 3. New API: Retry Blockchain

**Endpoint:** `POST /api/treasuries/:id/transactions/:txId/retry-blockchain`

**Permission:** Treasurer hoặc Admin

**Logic:**
```go
func (h *TransactionHandler) RetryBlockchainLog(c *gin.Context) {
	// 1. Kiểm tra quyền (treasurer/admin)
	// 2. Lấy transaction (must be CONFIRMED)
	// 3. Kiểm tra ChainLog.status (chỉ retry nếu 'none' hoặc 'failed')
	// 4. Gọi blockchain logging async
	// 5. Trả về ngay {"message": "Blockchain logging retry initiated"}
}
```

**Use cases:**
- Gas hết → Admin nạp gas → Retry blockchain
- Network timeout → Retry blockchain
- Contract chưa deploy → Deploy xong → Retry blockchain

---

## 📊 Smart Contract Optimization

### Before (Old Contract)
```solidity
// Lưu đầy đủ thông tin on-chain
struct LogEntry {
    address treasury;
    uint256 amountToken;
    bool isIncome;
    bytes32 detailHash;
    uint256 timestamp;
    address loggedBy;
}
mapping(uint256 => LogEntry) public logs; // Tốn nhiều storage
mapping(address => uint256[]) public treasuryLogs;
uint256 public logCount;

// Gas usage: ~200,000-300,000 per transaction
```

### After (New Contract)
```solidity
// CHỈ emit event, KHÔNG lưu storage
contract TreasuryLogger {
    event TransactionLogged(
        address indexed treasury,
        bytes32 indexed detailHash
    );

    function logTransaction(
        address _treasury,
        bytes32 _detailHash
    ) external {
        emit TransactionLogged(_treasury, _detailHash);
    }
}

// Gas usage: ~23,762 per transaction (tiết kiệm 90%)
```

**Lợi ích:**
- Gas giảm từ ~250k → **~24k** (90% tiết kiệm)
- Contract size: 93 lines → **32 lines**
- Bytecode: ~7KB → **1.5KB**
- Vẫn có event log đầy đủ trên blockchain explorer

---

## 🔄 Workflow Diagram

### Luồng CŨ:
```
Tạo TX → Pending → Thủ quỹ Confirm → Confirmed
                                         ↓
                               Ghi Blockchain thành công → Completed
                                         ↓
                               Ghi Blockchain thất bại → Rollback to Pending ❌
```

### Luồng MỚI:
```
Tạo TX → Pending → Thủ quỹ Confirm → Confirmed ✅ (ĐÃ GHI VÀO SỔ)
                                         ↓
                                    Balance/Report cập nhật ngay
                                         ↓
                               ┌─────────┴─────────┐
                               ↓                   ↓
                    Blockchain Success      Blockchain Failed
                    ChainLog.status=success ChainLog.status=failed
                                                    ↓
                                              Có thể Retry bất cứ lúc nào
```

---

## 📝 Files Changed

### Backend
1. `/backend/internal/models/models.go`
   - Xóa `TransactionStatusCompleted`
   - Thêm `BlockchainStatus` enum
   - Update `ChainLog` struct

2. `/backend/internal/api/transaction_handler.go`
   - Sửa `ConfirmTransaction()` - không chờ blockchain
   - Thêm `logTransactionToBlockchain()` helper
   - Thêm `RetryBlockchainLog()` API

3. `/backend/internal/api/treasury_handler.go`
   - Update `GetBalance()` query

4. `/backend/internal/api/report_handler.go`
   - Update tất cả queries: `completed` → `confirmed`

5. `/backend/cmd/main.go`
   - Thêm route: `POST /treasuries/:id/transactions/:txId/retry-blockchain`

6. `/backend/internal/services/blockchain_service.go`
   - Giảm gas limit: 300k → 50k
   - Đơn giản hóa params: chỉ gửi (treasury, detailHash)

### Smart Contract
7. `/contracts/TreasuryLogger.sol`
   - Xóa toàn bộ storage (mappings, struct)
   - Chỉ giữ event + function minimal

### Database
8. Migration SQL đã chạy thành công ✅

---

## ✅ Testing Checklist

- [x] Migration database thành công
- [x] Smart contract deploy thành công (gas = 23,762)
- [x] Backend code changes hoàn thành
- [x] Build backend thành công
- [x] Frontend update hoàn thành
- [x] Local testing passed
- [x] Committed và pushed lên production (commit: a0fe3bb)

---

## 🚀 Deployment Instructions

### Build & Deploy với Docker
```bash
# Stop containers
docker-compose down

# Build backend với frontend embedded
docker-compose build app

# Start all services
docker-compose up -d

# Verify
docker-compose ps
docker logs quychung-app --tail 50
curl http://localhost:8080/api/health
```

### Deploy to Production
```bash
# Pull latest code
git pull origin main

# Build and deploy
docker-compose down
docker-compose build app
docker-compose up -d

# Verify deployment
docker logs quychung-app --tail 50
```

---

## 🎯 Summary - HOÀN THÀNH

**✅ Đã hoàn thành:**
- ✅ Tách biệt hoàn toàn nghiệp vụ quản lý quỹ và blockchain logging
- ✅ Thủ quỹ confirm → Transaction có hiệu lực ngay (không chờ blockchain)
- ✅ Blockchain chỉ là verification layer, không ảnh hưởng nghiệp vụ
- ✅ Gas fee giảm 90% (250k → 24k)
- ✅ Có thể retry blockchain bất cứ lúc nào
- ✅ Frontend hiển thị blockchain status và retry button
- ✅ Build & deploy thành công
- ✅ Committed lên production (commit: a0fe3bb)

**📦 Deliverables:**
- Backend API với retry blockchain endpoint
- Smart contract tối ưu (chỉ emit events)
- Frontend UI với blockchain status display
- Database migration scripts
- Full documentation
