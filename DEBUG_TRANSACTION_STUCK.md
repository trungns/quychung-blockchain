# 🔍 DEBUG: Giao dịch bị "Đang xử lý..." mãi

## Vấn đề hiện tại:

Log chỉ thấy:
```
GET "/" - 200
GET "/api/treasuries/..." - 200
```

**KHÔNG thấy:**
```
POST "/api/treasuries/.../transactions" 
```

→ Backend không nhận được request tạo transaction!

---

## Bước 1: Kiểm tra Frontend có gọi API không

### Mở Developer Tools trên Browser:

1. Mở https://quychung.wellytech.vn
2. Nhấn F12 (hoặc Cmd+Option+I trên Mac)
3. Vào tab **Network**
4. Tạo một giao dịch
5. Xem có request POST `/api/treasuries/.../transactions` không?

### Nếu KHÔNG có request:
→ Lỗi ở frontend (JavaScript error)

**Giải quyết:**
- Vào tab **Console** trong DevTools
- Xem có lỗi JavaScript không?
- Copy lỗi và gửi cho tôi

### Nếu CÓ request nhưng bị lỗi (4xx, 5xx):
→ Backend có vấn đề

**Tiếp tục bước 2**

---

## Bước 2: Kiểm tra Backend logs chi tiết

### A. Xem tất cả logs (không filter):

```bash
kubectl logs -n quychung -l app=quychung,component=app --tail=200
```

Tìm dòng:
- `POST /api/treasuries/.../transactions`
- `Failed to...`
- `Error:`
- `panic:`

### B. Xem logs real-time khi tạo transaction:

```bash
# Terminal 1: Theo dõi logs
kubectl logs -n quychung -l app=quychung,component=app -f

# Terminal 2: Tạo giao dịch trên web
# (Mở browser và tạo transaction)

# Xem logs terminal 1 có gì?
```

---

## Bước 3: Kiểm tra blockchain service có hoạt động không

### Exec vào pod:

```bash
kubectl exec -n quychung -it $(kubectl get pod -n quychung -l app=quychung,component=app -o jsonpath='{.items[0].metadata.name}') -- sh
```

### Trong pod, kiểm tra:

```bash
# 1. Contract file có tồn tại không?
ls -la /root/contracts/
cat /root/contracts/TreasuryLogger.json | grep address

# 2. Environment variables đúng không?
echo $BLOCKCHAIN_RPC
echo $TREASURY_PRIVATE_KEY

# 3. Exit
exit
```

---

## Bước 4: Test API trực tiếp

### Test tạo transaction qua curl:

```bash
# Lấy token từ browser
# 1. Mở DevTools → Application → Local Storage
# 2. Copy giá trị của key "token"

TOKEN="<paste-token-here>"

# Test create transaction
curl -X POST https://quychung.wellytech.vn/api/treasuries/d561dc26-81cf-4117-9d05-bcb446d3f481/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "is_income": false,
    "description": "Test transaction",
    "member_id": "your-user-id"
  }'
```

### Xem response:
- **200 OK** → Backend xử lý OK
- **400/500** → Backend có lỗi (xem message)
- **No response** → Network issue

---

## Bước 5: Kiểm tra code backend xử lý transaction

### File cần xem:

Có thể là:
- `backend/internal/api/transaction.go`
- `backend/internal/services/blockchain.go`

### Kiểm tra logic:

1. Backend có gọi blockchain service không?
2. Có handle error và return về frontend không?
3. Có log ra console không?

---

## Nguyên nhân thường gặp:

### A. Frontend không gọi API (JavaScript error)

**Triệu chứng:**
- Không thấy request trong Network tab
- Console có lỗi

**Giải quyết:**
- Fix JavaScript error
- Rebuild frontend

### B. Backend không log transaction lên blockchain

**Triệu chứng:**
- Có request POST trong logs
- Response 200 OK
- Nhưng không có log blockchain

**Nguyên nhân:**
- Blockchain service không khởi tạo được
- Contract file không tồn tại
- Private key sai

**Giải quyết:**
```bash
# Kiểm tra logs khi backend start
kubectl logs -n quychung -l app=quychung,component=app --tail=500 | grep -i "blockchain\|contract\|warning\|failed"

# Tìm dòng:
# "Warning: Failed to initialize blockchain service"
```

### C. Transaction gửi lên blockchain nhưng failed

**Triệu chứng:**
- Có request POST
- Response 200 (hoặc 500)
- Blockchain transaction failed

**Nguyên nhân:**
- Hết MATIC
- Gas price quá thấp
- Contract function sai

**Giải quyết:**
- Kiểm tra số dư: https://amoy.polygonscan.com/address/0xbF83E1A2fF4a7356c4312C619312125b255DEAfC
- Lấy thêm MATIC từ faucet

### D. Frontend không update UI sau khi transaction success

**Triệu chứng:**
- Transaction thành công trên blockchain
- Nhưng UI vẫn hiện "Đang xử lý..."

**Nguyên nhân:**
- Frontend không listen response từ backend
- Không update state sau khi API return

**Giải quyết:**
- Fix frontend code để update UI
- Reload page để thấy data mới

---

## Quick Fix: Thêm logging vào backend

### Tạm thời thêm log để debug:

File: `backend/internal/api/transaction.go`

```go
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
    log.Println("=== START CreateTransaction ===")
    
    // ... existing code ...
    
    log.Printf("Treasury ID: %s", treasuryID)
    log.Printf("Transaction data: %+v", req)
    
    // Call blockchain
    log.Println("Calling blockchain service...")
    txHash, err := h.blockchainService.LogTransaction(...)
    if err != nil {
        log.Printf("ERROR calling blockchain: %v", err)
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    log.Printf("Blockchain tx hash: %s", txHash)
    log.Println("=== END CreateTransaction ===")
}
```

Rebuild và redeploy để xem logs chi tiết hơn.

---

## Tóm tắt bước debug:

1. ✅ Kiểm tra Network tab trong DevTools
2. ✅ Xem Backend logs khi tạo transaction
3. ✅ Verify contract file và env vars trong pod
4. ✅ Test API trực tiếp bằng curl
5. ✅ Thêm logging vào code backend
6. ✅ Rebuild và test lại

**Hãy chạy từng bước và báo kết quả cho tôi!**
