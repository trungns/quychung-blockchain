# Quỹ Chung - Treasury Management System

Hệ thống quản lý quỹ chung minh bạch với blockchain cho nhóm ~100 người.

## Tính năng

- ✅ **Quản lý quỹ**: Tạo và quản lý nhiều quỹ, mỗi quỹ tối đa ~100 thành viên
- ✅ **Thu/Chi minh bạch**: Ghi nhận mọi giao dịch thu/chi với blockchain
- ✅ **Số dư realtime**: Tính toán và hiển thị số dư tức thì
- ✅ **Xác thực Google**: Đăng nhập an toàn với tài khoản Google
- ✅ **Responsive**: Giao diện thân thiện trên cả desktop và mobile
- ✅ **Blockchain**: Mọi giao dịch được ghi lên blockchain riêng tư
- ✅ **Open-source**: Mã nguồn mở, miễn phí, MIT License

## Kiến trúc

```
├── backend/          # Golang API server
│   ├── cmd/         # Main application
│   ├── internal/    # Business logic
│   └── contracts/   # Smart contracts
├── frontend/        # React.js web app
├── blockchain/      # Private Ethereum network (Geth)
├── scripts/         # Deployment scripts
└── docker-compose.yml
```

### Tech Stack

- **Backend**: Golang 1.21, Gin, GORM, go-ethereum
- **Frontend**: React.js 18, React Router, Axios
- **Database**: PostgreSQL 15
- **Blockchain**: Hardhat (Development blockchain)
- **Smart Contracts**: Solidity 0.8
- **Auth**: Google OAuth 2.0
- **DevOps**: Docker, Docker Compose

## Quickstart (5 phút)

### Yêu cầu

- Docker & Docker Compose
- Google OAuth Client ID (xem hướng dẫn bên dưới)

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd quychung
```

### Bước 2: Cấu hình Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** → **Credentials**
4. Tạo **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`
5. Copy **Client ID** và **Client Secret**

### Bước 3: Tạo file .env

```bash
cp .env.example .env
```

Chỉnh sửa `.env` và điền:
```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### Bước 4: Khởi động hệ thống

```bash
# Khởi động tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f
```

Đợi khoảng 30-60 giây để các services khởi động hoàn tất.

### Bước 5: Deploy Smart Contract

```bash
# Deploy contract lên Hardhat blockchain
make deploy-contract
```

### Bước 6: Truy cập ứng dụng

Mở trình duyệt: **http://localhost:3000**

🎉 Hoàn tất! Bạn có thể đăng nhập với Google và bắt đầu sử dụng.

## Sử dụng

### Tạo quỹ mới

1. Đăng nhập với Google
2. Click **"Tạo quỹ mới"**
3. Nhập tên và mô tả quỹ
4. Bạn sẽ tự động trở thành admin của quỹ

### Thêm thành viên

1. Vào chi tiết quỹ
2. Click **"Thêm thành viên"**
3. Nhập email của người cần thêm (người đó phải đăng nhập ít nhất 1 lần)

### Nhập giao dịch Thu/Chi

1. Trong quỹ, click **"Nhập thu"** hoặc **"Nhập chi"**
2. Nhập số tiền và ghi chú
3. Giao dịch sẽ được lưu vào DB và ghi lên blockchain

### Xem lịch sử

- Tất cả giao dịch hiển thị trong bảng với thông tin:
  - Ngày giờ
  - Loại (Thu/Chi)
  - Số tiền
  - Ghi chú
  - Người tạo
  - TX hash trên blockchain

## 📚 Documentation

**Toàn bộ tài liệu chi tiết**: [docs/README.md](docs/README.md)

### Quick Links

- 🚀 **[Getting Started](docs/guides/GETTING_STARTED.md)** - Setup từ đầu
- 📖 **[Comprehensive Documentation](docs/references/COMPREHENSIVE_DOCUMENTATION.md)** - Tài liệu chính (2000+ dòng)
- 🔌 **[API Reference](docs/references/API_REFERENCE.md)** - Chi tiết tất cả APIs
- 🚢 **[Deployment Checklist](docs/operations/DEPLOYMENT_CHECKLIST.md)** - Deploy production
- 🐛 **[Troubleshooting](docs/troubleshooting/)** - Debug issues

### API Overview

**Authentication**
- `POST /api/auth/google-login` - Login with Google

**Treasuries**
- `POST /api/treasuries` - Tạo quỹ mới
- `GET /api/treasuries` - Lấy danh sách quỹ
- `GET /api/treasuries/:id` - Chi tiết quỹ
- `GET /api/treasuries/:id/balance` - Số dư quỹ
- `POST /api/treasuries/:id/members` - Thêm thành viên

**Transactions**
- `POST /api/treasuries/:id/transactions` - Tạo giao dịch
- `GET /api/treasuries/:id/transactions` - Lịch sử giao dịch

**Reports**
- `GET /api/treasuries/:id/reports/income-by-member` - Thu theo member
- `GET /api/treasuries/:id/reports/monthly-expense` - Chi theo tháng
- `GET /api/treasuries/:id/reports/yearly-summary` - Tổng kết năm
- `GET /api/treasuries/:id/reports/top-contributors` - Top đóng góp

📖 **Xem chi tiết**: [API Reference](docs/references/API_REFERENCE.md)

## Development

### Chạy Backend riêng

```bash
cd backend
go mod download
go run cmd/main.go
```

### Chạy Frontend riêng

```bash
cd frontend
npm install
npm start
```

### Database Migration

Migrations tự động chạy khi backend khởi động. Schema xem tại: [scripts/init-db.sql](scripts/init-db.sql)

### Smart Contract

- Source: [contracts/TreasuryLogger.sol](contracts/TreasuryLogger.sol)
- Deploy script: [scripts/deploy-contract.js](scripts/deploy-contract.js)

## Troubleshooting

### Quick Fixes

**Lỗi kết nối database**
```bash
docker-compose restart postgres backend
```

**Lỗi blockchain**
```bash
docker-compose restart hardhat
docker-compose restart backend
make deploy-contract
```

**Reset toàn bộ**
```bash
docker-compose down -v
docker-compose up -d
```

📖 **Chi tiết troubleshooting**: [Troubleshooting Guides](docs/troubleshooting/)

## Cấu trúc Database

```sql
users           - Người dùng (từ Google OAuth)
treasuries      - Quỹ
members         - Thành viên trong quỹ
transactions    - Giao dịch thu/chi
chain_logs      - Log blockchain
```

## Bảo mật

- ✅ JWT token authentication
- ✅ Google OAuth 2.0
- ✅ Private blockchain (không public)
- ✅ HTTPS recommended (production)
- ✅ Rate limiting
- ⚠️ Backend giữ private key (cần vault cho production)

## Production Deployment

### Khuyến nghị

1. **HTTPS**: Sử dụng reverse proxy (nginx/traefik) với SSL
2. **Environment**: Thay đổi tất cả secrets trong `.env`
3. **Database**: Backup định kỳ PostgreSQL
4. **Blockchain**: Backup geth data
5. **Monitoring**: Thêm logging và monitoring
6. **Key Management**: Dùng vault (HashiCorp Vault, AWS KMS) cho private keys

### Docker Compose Production

```yaml
# Thêm vào docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

## Contributing

Pull requests are welcome! Để contribute:

1. Fork repository
2. Tạo branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## Roadmap

- [ ] Export báo cáo Excel/PDF
- [ ] Thông báo realtime (WebSocket)
- [ ] Multi-signature approval
- [ ] Budget planning
- [ ] Mobile app (React Native)
- [ ] Public blockchain option (Polygon, BSC)

## License

MIT License - xem [LICENSE](LICENSE)

## Support

- Issues: https://github.com/your-repo/issues
- Discussions: https://github.com/your-repo/discussions

## Credits

Được phát triển với ❤️ bởi cộng đồng open-source.

**Tech Stack:**
- [Gin](https://github.com/gin-gonic/gin) - Go web framework
- [GORM](https://gorm.io/) - Go ORM
- [go-ethereum](https://github.com/ethereum/go-ethereum) - Ethereum client
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Database

---

Made with 🤖 [Claude Code](https://claude.com/claude-code)
