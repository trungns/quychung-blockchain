# Quickstart Guide - 5 phút

## Bước 1: Cài đặt Google OAuth

1. Vào https://console.cloud.google.com/apis/credentials
2. Tạo **OAuth 2.0 Client ID**
3. Authorized redirect URIs: `http://localhost:3000/auth/callback`
4. Copy **Client ID** và **Client Secret**

## Bước 2: Cấu hình

```bash
# Clone repo (hoặc cd vào thư mục)
cd quychung

# Copy .env
cp .env.example .env

# Sửa .env với Google credentials
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# REACT_APP_GOOGLE_CLIENT_ID=...
```

## Bước 3: Khởi động (Cách 1 - Tự động)

```bash
make init
```

## Bước 3: Khởi động (Cách 2 - Thủ công)

```bash
# Khởi động services
docker-compose up -d

# Đợi 30 giây

# Deploy contract
docker-compose exec backend sh
cd /root
npm install web3 solc
node scripts/deploy-contract.js
exit
```

## Bước 4: Truy cập

Mở http://localhost:3000

## Commands hữu ích

```bash
make start              # Khởi động
make stop               # Dừng
make logs               # Xem logs
make deploy-contract    # Deploy contract
make reset              # Xóa hết data
make help               # Xem tất cả commands
```

## Troubleshooting

**Lỗi kết nối:**
```bash
make restart
```

**Reset toàn bộ:**
```bash
make reset
make init
```

**Xem logs:**
```bash
make logs
```

Vậy là xong! 🎉
