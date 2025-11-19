# Getting Started - Hướng dẫn từng bước

## Bước 1: Kiểm tra yêu cầu hệ thống

### Cần có:
- Docker Desktop (hoặc Docker + Docker Compose)
- Trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
- Tài khoản Google (để đăng nhập)

### Kiểm tra Docker:
```bash
docker --version
docker-compose --version
```

Nếu chưa có, tải tại: https://www.docker.com/products/docker-desktop

## Bước 2: Tạo Google OAuth Credentials

1. **Truy cập Google Cloud Console**
   - Vào: https://console.cloud.google.com/

2. **Tạo Project (nếu chưa có)**
   - Click "Select a project" → "New Project"
   - Nhập tên project: "Quỹ Chung"
   - Click "Create"

3. **Kích hoạt Google OAuth**
   - Vào menu: APIs & Services → Credentials
   - Click "Configure Consent Screen"
   - Chọn "External" → Create
   - Điền thông tin:
     - App name: Quỹ Chung
     - User support email: email của bạn
     - Developer contact: email của bạn
   - Save and Continue (bỏ qua các bước khác)

4. **Tạo OAuth Client ID**
   - Vào Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: Quỹ Chung Web Client
   - Authorized redirect URIs:
     - Add: `http://localhost:3000/auth/callback`
   - Click "Create"

5. **Lưu credentials**
   - Copy **Client ID** (dạng: xxx.apps.googleusercontent.com)
   - Copy **Client Secret**

## Bước 3: Cấu hình Project

### Clone hoặc download code
```bash
cd quychung
```

### Tạo file .env
```bash
cp .env.example .env
```

### Sửa file .env
Mở file `.env` và điền:

```bash
# Thay YOUR_CLIENT_ID và YOUR_CLIENT_SECRET bằng giá trị từ bước 2
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com

# Các config khác giữ nguyên
```

## Bước 4: Khởi động hệ thống

### Cách 1: Sử dụng Makefile (Khuyến nghị)
```bash
make init
```

Script sẽ tự động:
- Tạo .env nếu chưa có
- Khởi động Docker services
- Chờ các services sẵn sàng

### Cách 2: Thủ công
```bash
# Khởi động services
docker-compose up -d

# Đợi 30-60 giây

# Xem logs để đảm bảo mọi thứ OK
docker-compose logs -f
```

## Bước 5: Deploy Smart Contract

Sau khi services đã chạy (đợi ~30s), deploy contract:

```bash
make deploy-contract
```

Hoặc thủ công:
```bash
docker-compose exec backend sh
cd /root
npm install web3 solc
node scripts/deploy-contract.js
exit
```

## Bước 6: Truy cập ứng dụng

1. Mở trình duyệt
2. Vào: **http://localhost:3000**
3. Click "Sign in with Google"
4. Chọn tài khoản Google
5. Cho phép ứng dụng truy cập

🎉 Hoàn thành! Bạn đã vào được trang chủ.

## Bước 7: Sử dụng ứng dụng

### Tạo quỹ đầu tiên
1. Click "Tạo quỹ mới"
2. Nhập tên (VD: "Quỹ lớp 10A1")
3. Nhập mô tả (tùy chọn)
4. Click "Tạo quỹ"

### Thêm thành viên
1. Click vào quỹ vừa tạo
2. Click "Thêm thành viên"
3. Nhập email của người muốn thêm
   - ⚠️ Người đó phải đăng nhập ít nhất 1 lần trước
4. Click "Thêm"

### Nhập giao dịch Thu
1. Trong quỹ, click "Nhập thu"
2. Nhập số tiền (VD: 100000)
3. Nhập ghi chú (VD: "Đóng quỹ tháng 1")
4. Click "Xác nhận"
5. Đợi vài giây → giao dịch xuất hiện trong lịch sử

### Nhập giao dịch Chi
1. Click "Nhập chi"
2. Nhập số tiền (VD: 50000)
3. Nhập ghi chú (VD: "Mua đồ dùng học tập")
4. Click "Xác nhận"

### Xem số dư
- Số dư hiển thị realtime ở đầu trang
- Tổng thu, tổng chi, và số dư còn lại

### Xem blockchain hash
- Mỗi giao dịch có TX hash (hash blockchain)
- Đảm bảo tính minh bạch và không thể sửa đổi

## Troubleshooting

### Lỗi "Cannot connect to backend"
```bash
# Restart backend
make restart

# Hoặc
docker-compose restart backend
```

### Lỗi "Login failed"
- Kiểm tra GOOGLE_CLIENT_ID trong .env
- Kiểm tra redirect URI: `http://localhost:3000/auth/callback`
- Thử clear cookies và login lại

### Lỗi "Contract not deployed"
```bash
make deploy-contract
```

### Services không start
```bash
# Xem logs
make logs

# Reset toàn bộ
make reset
make init
```

### Port 3000 hoặc 8080 đã được sử dụng
```bash
# Tìm process đang dùng port
lsof -i :3000
lsof -i :8080

# Kill process
kill -9 <PID>

# Hoặc đổi port trong docker-compose.yml
```

## Câu lệnh hữu ích

```bash
make help           # Xem tất cả commands
make start          # Khởi động services
make stop           # Dừng services
make logs           # Xem logs
make restart        # Restart services
make status         # Kiểm tra status
make reset          # Reset toàn bộ (xóa data)
./scripts/verify.sh # Verify installation
```

## Tiếp theo

- Đọc [README.md](README.md) để hiểu rõ hơn về hệ thống
- Xem [STRUCTURE.md](STRUCTURE.md) để hiểu kiến trúc
- Xem [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) để biết tổng quan

## Cần trợ giúp?

- Xem [README.md](README.md) - Troubleshooting section
- Check logs: `make logs`
- Verify: `./scripts/verify.sh`

Chúc bạn sử dụng thành công! 🎉
