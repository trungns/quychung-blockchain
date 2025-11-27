# Hướng dẫn Deploy & Test - Thay đổi Workflow mới

## ✅ Đã hoàn thành

### 1. Code Changes
- ✅ Models: Thêm `BlockchainStatus`, xóa `TransactionStatusCompleted`
- ✅ Transaction Handler: Confirm không chờ blockchain, thêm RetryBlockchainLog API
- ✅ Balance & Reports: Chỉ tính `confirmed` transactions
- ✅ Smart Contract: Tối ưu từ 93 lines → 32 lines, gas giảm 90%
- ✅ Database Migration: Đã chạy thành công
- ✅ Backend Binary: Build thành công (22MB tại `bin/app`)

### 2. Files đã thay đổi
```
backend/internal/models/models.go
backend/internal/api/transaction_handler.go
backend/internal/api/treasury_handler.go
backend/internal/api/report_handler.go
backend/cmd/main.go
backend/internal/services/blockchain_service.go
contracts/TreasuryLogger.sol
contracts/TreasuryLogger.json (deployed)
```

---

## 🚀 Deployment Steps

### Bước 1: Verify Backend Build
```bash
cd /Users/trungns/training/blockchain/quychung
ls -lh bin/app
# Should show: -rwxr-xr-x  22M Nov 26 11:46 bin/app
```

### Bước 2: Stop & Restart Containers
```bash
# Option A: Rebuild Docker image (nếu muốn)
docker-compose down app
docker-compose build app
docker-compose up -d app

# Option B: Hoặc đơn giản restart (code đã build rồi)
docker-compose restart app
```

### Bước 3: Verify Containers Running
```bash
docker ps
# Cần thấy 3 containers:
# - quychung-app (port 8080)
# - quychung-hardhat (port 8545)
# - quychung-postgres (port 5432)
```

### Bước 4: Check Backend Logs
```bash
docker logs quychung-app --tail 50

# Cần thấy:
# - "Server starting on port 8080"
# - "Contract ABI parsed successfully"
# - Không có errors
```

### Bước 5: Verify Database Migration
```bash
docker exec quychung-postgres psql -U quychung -d quychung -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chain_logs'
ORDER BY ordinal_position;
"

# Cần thấy columns:
# - status (character varying) - default 'none'
# - error_detail (text)
# - updated_at (timestamp)
```

---

## 🧪 Testing Guide

### Test 1: Health Check
```bash
curl http://localhost:8080/api/health
# Expected: {"status":"ok"}
```

### Test 2: Login & Get Token
1. Mở browser: http://localhost:8080
2. Login với Google
3. Mở DevTools → Application → Local Storage
4. Copy JWT token

```bash
export TOKEN="your_jwt_token_here"
export TREASURY_ID="your_treasury_id"
```

### Test 3: Create Transaction
```bash
curl -X POST http://localhost:8080/api/treasuries/$TREASURY_ID/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INCOME",
    "amount_token": 100,
    "note": "Test new workflow"
  }' | jq '.'

# Save transaction ID
export TX_ID="transaction_id_from_response"
```

### Test 4: Confirm Transaction (Thủ quỹ)
```bash
curl -X POST http://localhost:8080/api/treasuries/$TREASURY_ID/transactions/$TX_ID/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmed_amount": 100
  }' | jq '.'

# Expected response:
# {
#   "status": "confirmed",  ← Ngay lập tức!
#   "chain_log": {
#     "status": "pending" hoặc "success" hoặc "failed"
#   }
# }
```

### Test 5: Verify Balance Updates Immediately
```bash
curl -X GET http://localhost:8080/api/treasuries/$TREASURY_ID/balance \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Balance đã tăng 100 ngay lập tức
# (không cần chờ blockchain confirm)
```

### Test 6: Check Blockchain Status
```bash
curl -X GET http://localhost:8080/api/treasuries/$TREASURY_ID/transactions \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.id == "'$TX_ID'")'

# Check chain_log.status:
# - "none": Chưa ghi blockchain
# - "pending": Đang ghi
# - "success": Đã ghi thành công
# - "failed": Ghi thất bại → có thể retry
```

### Test 7: Retry Blockchain (nếu failed)
```bash
curl -X POST http://localhost:8080/api/treasuries/$TREASURY_ID/transactions/$TX_ID/retry-blockchain \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected:
# {
#   "message": "Blockchain logging retry initiated",
#   "status": "pending"
# }
```

### Test 8: Verify Gas Savings
```bash
# Check blockchain logs
docker logs quychung-app 2>&1 | grep "Gas limit: 50000 (minimal)"

# Verify contract bytecode size
wc -l contracts/TreasuryLogger.sol
# Expected: 32 lines

cat contracts/TreasuryLogger.json | jq '.bytecode | length'
# Expected: 520 (1.5KB encoded)
```

---

## 📊 Verification Checklist

### Backend
- [ ] Binary build thành công (22MB)
- [ ] Containers running (app, postgres, hardhat)
- [ ] No errors in logs
- [ ] API health check OK

### Database
- [ ] Migration thành công
- [ ] ChainLog có columns: status, error_detail, updated_at
- [ ] Không còn status 'completed' trong transactions

### Smart Contract
- [ ] Contract chỉ 32 lines
- [ ] Bytecode ~1.5KB
- [ ] Gas limit = 50,000 (giảm từ 300,000)

### API Endpoints
- [ ] POST `/treasuries/:id/transactions` - Tạo transaction
- [ ] POST `/treasuries/:id/transactions/:txId/confirm` - Confirm ngay
- [ ] POST `/treasuries/:id/transactions/:txId/retry-blockchain` - **NEW!**
- [ ] GET `/treasuries/:id/balance` - Tính từ confirmed
- [ ] GET `/treasuries/:id/transactions` - Hiển thị chain_log.status

### Business Logic
- [ ] Confirm → Transaction.status = "confirmed" ngay lập tức
- [ ] Balance/Reports tính từ confirmed transactions
- [ ] Blockchain logging là async, không block
- [ ] Blockchain fail → Transaction vẫn confirmed, có thể retry

---

## 🔍 Troubleshooting

### Issue 1: Container không start
```bash
# Check logs
docker-compose logs app

# Rebuild từ đầu
docker-compose down
docker-compose up -d
```

### Issue 2: Database migration chưa chạy
```bash
# Chạy manual migration
docker exec quychung-postgres psql -U quychung -d quychung < /path/to/migration.sql
```

### Issue 3: Blockchain logging failed
```bash
# Check hardhat container
docker logs quychung-hardhat

# Verify contract deployed
cat contracts/TreasuryLogger.json | jq '.address'

# Test contract directly
npx hardhat run scripts/test-gas-usage.js --network localhost
```

### Issue 4: API retry blockchain không hoạt động
```bash
# Check route registered
docker logs quychung-app | grep "retry-blockchain"

# Verify user role (phải là treasurer/admin)
curl -X GET http://localhost:8080/api/treasuries/$TREASURY_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.members'
```

---

## 📝 Next Steps (Frontend)

Sau khi backend hoạt động ổn, cần update frontend:

### Changes cần làm:
1. **Transaction List UI:**
   - Xóa status badge "Completed"
   - Thêm badge cho `chain_log.status`: none/pending/success/failed
   - Thêm icon blockchain bên cạnh status

2. **Retry Button:**
   ```jsx
   {transaction.status === 'confirmed' &&
    transaction.chain_log?.status === 'failed' &&
    (role === 'admin' || role === 'treasurer') && (
      <button onClick={() => retryBlockchain(transaction.id)}>
        🔄 Retry Blockchain
      </button>
   )}
   ```

3. **Status Display:**
   ```jsx
   // Transaction status (nghiệp vụ)
   <Badge color={transaction.status === 'confirmed' ? 'green' : 'yellow'}>
     {transaction.status}
   </Badge>

   // Blockchain status (riêng biệt)
   <BlockchainBadge status={transaction.chain_log?.status} />
   ```

4. **API Service:**
   ```typescript
   async retryBlockchain(treasuryId: string, txId: string) {
     return api.post(
       `/treasuries/${treasuryId}/transactions/${txId}/retry-blockchain`
     );
   }
   ```

---

## 🎯 Success Criteria

✅ **Backend đã hoàn thành nếu:**
1. Transaction confirm → status = "confirmed" ngay lập tức
2. Balance/Reports update ngay khi confirmed
3. Blockchain logging không block nghiệp vụ
4. API retry blockchain hoạt động
5. Gas giảm 90% (từ ~250k → ~24k)

⏳ **Frontend cần làm:**
1. Hiển thị blockchain status riêng
2. Thêm retry button cho admin/treasurer
3. Update UI cho flow mới

---

## 📚 References

- [Workflow Changes Summary](./WORKFLOW_CHANGES_SUMMARY.md)
- [Smart Contract Code](../contracts/TreasuryLogger.sol)
- [Transaction Handler](../backend/internal/api/transaction_handler.go)
- [Test Script](../scripts/test-new-workflow.sh)
