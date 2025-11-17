# 🚀 HƯỚNG DẪN KHỞI ĐỘNG HỆ THỐNG VỚI TESTNET

## ✅ Đã cấu hình xong:
- ✅ Contract deployed lên Polygon Amoy Testnet
- ✅ Backend .env đã cấu hình kết nối testnet
- ✅ File TreasuryLogger.json đã có địa chỉ contract testnet

## 📋 CÁC BƯỚC KHỞI ĐỘNG:

### Bước 1: Khởi động Docker (chỉ cho PostgreSQL)

```bash
# Mở Docker Desktop hoặc khởi động Docker daemon

# Xóa toàn bộ data cũ (nếu muốn)
docker-compose down -v

# Khởi động PostgreSQL
docker-compose up -d postgres
```

**Lưu ý:** Không cần khởi động Hardhat nữa vì đã dùng testnet!

### Bước 2: Khởi động Backend

```bash
cd backend

# Cài đặt dependencies (nếu chưa)
npm install

# Khởi động backend
npm run dev
```

Backend sẽ:
- ✅ Kết nối PostgreSQL (localhost:5432)
- ✅ Kết nối Polygon Amoy Testnet
- ✅ Sẵn sàng ghi data lên blockchain testnet

### Bước 3: Khởi động Frontend

```bash
cd frontend

# Cài đặt dependencies (nếu chưa)
npm install

# Khởi động frontend
npm start
```

Frontend sẽ mở tại: http://localhost:3000

---

## 🎯 KHI TẠO QUỸ TRÊN GIAO DIỆN:

Khi bạn tạo quỹ mới và thực hiện giao dịch:

1. ✅ Data ghi vào PostgreSQL (localhost)
2. ✅ Transaction ghi lên **Polygon Amoy Testnet**
3. ✅ Có thể xem trên PolygonScan: https://amoy.polygonscan.com/address/0xF95395e8eFc43AA57Ef518d423AeC58f8722944e

---

## 💾 XÓA DATA POSTGRESQL (Nếu cần):

### Cách 1: Xóa volumes Docker
```bash
docker-compose down -v
docker-compose up -d postgres
```

### Cách 2: Xóa trực tiếp trong database
```bash
# Truy cập PostgreSQL
docker exec -it quychung-postgres-1 psql -U quychung -d quychung

# Xóa tất cả data
DROP TABLE IF EXISTS treasuries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

# Thoát
\q
```

Sau khi xóa, backend sẽ tự tạo lại tables khi khởi động.

---

## 🔍 KIỂM TRA HỆ THỐNG HOẠT ĐỘNG:

### 1. Kiểm tra Backend kết nối testnet:
```bash
cd backend
node -e "
const web3 = require('web3');
const w3 = new web3('https://rpc-amoy.polygon.technology');
w3.eth.getChainId().then(id => console.log('Chain ID:', id));
"
```

Kết quả: `Chain ID: 80002` (Polygon Amoy)

### 2. Kiểm tra contract trên testnet:
Truy cập: https://amoy.polygonscan.com/address/0xF95395e8eFc43AA57Ef518d423AeC58f8722944e

Bạn sẽ thấy:
- ✅ 2 transactions (1 deploy + 1 test)
- ✅ Contract code
- ✅ Events/Logs

---

## 🎉 LỢI ÍCH CỦA TESTNET:

| Trước (Hardhat Local) | Sau (Polygon Amoy Testnet) |
|-----------------------|----------------------------|
| ❌ Data mất khi restart Docker | ✅ Data permanent |
| ❌ Không có block explorer | ✅ Có PolygonScan |
| ❌ 1 node duy nhất | ✅ Nhiều nodes thật |
| ❌ Chỉ test được local | ✅ Bạn bè có thể test |
| ✅ FREE | ✅ FREE (testnet MATIC) |

---

## ⚠️ LƯU Ý QUAN TRỌNG:

1. **Không cần chạy Hardhat Docker nữa**
   - Testnet thay thế Hardhat local
   - Chỉ cần PostgreSQL

2. **Private key trong backend/.env**
   - Ví có 0.083 MATIC (đủ cho nhiều transactions)
   - Khi hết MATIC, lấy thêm từ: https://faucet.polygon.technology/

3. **PostgreSQL vẫn chạy local**
   - Chỉ blockchain data lên testnet
   - Database vẫn ở localhost

4. **Contract address**
   - Contract: `0xF95395e8eFc43AA57Ef518d423AeC58f8722944e`
   - Network: Polygon Amoy (Chain ID: 80002)

---

## 🚨 TROUBLESHOOTING:

### Lỗi: "Cannot connect to database"
```bash
# Kiểm tra PostgreSQL đang chạy
docker ps | grep postgres

# Nếu không chạy, khởi động lại
docker-compose up -d postgres
```

### Lỗi: "Insufficient funds"
```bash
# Backend hết MATIC
# Lấy thêm từ faucet:
# 1. Truy cập: https://faucet.polygon.technology/
# 2. Chọn Polygon Amoy
# 3. Nhập: 0xbF83E1A2fF4a7356c4312C619312125b255DEAfC
# 4. Nhận 0.1 MATIC
```

### Lỗi: "Contract not found"
```bash
# Kiểm tra file TreasuryLogger.json
cat contracts/TreasuryLogger.json | grep address

# Kết quả phải là:
# "address": "0xF95395e8eFc43AA57Ef518d423AeC58f8722944e"
```

---

**Chúc bạn thành công! 🎉**
