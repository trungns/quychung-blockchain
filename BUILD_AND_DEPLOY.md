# Hướng dẫn build và deploy sau khi sửa lỗi contracts

## Vấn đề đã sửa:
- File `contracts/TreasuryLogger.json` không được copy vào Docker image
- Backend không thể khởi tạo blockchain service
- Transactions bị status "failed"

## Đã sửa:
- `backend/Dockerfile` line 37: Thêm `COPY ../contracts ./contracts`

## Build và Deploy:

### 1. Build Docker image (từ thư mục root project):

```bash
cd /Users/trungns/training/blockchain/quychung

# Build image
docker build -f backend/Dockerfile -t quychung:latest .

# Verify contracts are included
docker run --rm quychung:latest ls -la /root/contracts
```

**Expected output:**
```
total 12
drwxr-xr-x    2 root     root          4096 Nov 19 04:00 .
drwx------    1 root     root          4096 Nov 19 04:00 ..
-rw-r--r--    1 root     root          7195 Nov 17 14:18 TreasuryLogger.json
-rw-r--r--    1 root     root          2556 Nov  7 11:56 TreasuryLogger.sol
```

### 2. Push to registry:

```bash
# Tag với registry của bạn
docker tag quychung:latest <your-registry>/quychung:latest

# Push
docker push <your-registry>/quychung:latest
```

### 3. Deploy trên Devtron:

1. Vào **Devtron Dashboard**
2. App **quychung** → **Build & Deploy**
3. Trigger new build hoặc update image tag
4. Deploy to production

### 4. Verify sau khi deploy:

```bash
# Xem logs khởi động
kubectl logs -n quychung -l app=quychung,component=app --tail=100

# Tìm dòng này (không còn warning):
# ✅ "Server starting on port 8080"
# ❌ KHÔNG còn: "Warning: Contract not loaded"
```

### 5. Test transaction:

1. Tạo một transaction mới trên UI
2. Xem logs backend:
   ```bash
   kubectl logs -n quychung -l app=quychung,component=app -f
   ```
3. Tìm dòng log:
   ```
   SUCCESS: Transaction <id> logged to blockchain with tx_hash: 0x...
   ```

4. Kiểm tra trên UI: Status blockchain không còn "Đang xử lý...", hiển thị tx hash

---

## Environment Variables cần có trên Devtron:

Đảm bảo các biến sau đã được cấu hình trong Devtron Secrets/ConfigMap:

```yaml
# ConfigMap
BLOCKCHAIN_RPC: "https://rpc-amoy.polygon.technology"
CONTRACT_ADDRESS: "0xF95395e8eFc43AA57Ef518d423AeC58f8722944e"

# Secret
TREASURY_PRIVATE_KEY: "0xf608d9fad2f4f7fb588aac7ea8b3c32d976d2769044d90db2762a71ca6f10086"
```

Nếu thiếu các biến này, blockchain service sẽ không khởi tạo được!
