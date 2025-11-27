# Development Workflow - Quy trình Phát triển

**Áp dụng từ: 2025-11-19**

Sau khi hệ thống đã lên production, mọi thay đổi phải được test kỹ ở local trước khi commit lên Git.

---

## 🎯 Quy trình Chung

```
1. Code Changes (Local)
   ↓
2. Test on Local (http://localhost:3000)
   ↓
3. Review & Approve
   ↓
4. Git Commit
   ↓
5. Git Push → Auto Deploy to Production
```

---

## 🔧 Setup Môi trường Local

### Lần đầu tiên

```bash
# 1. Clone repository
git clone <repo-url>
cd quychung

# 2. Copy .env file
cp .env.example .env

# 3. Edit .env với Google OAuth credentials
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# REACT_APP_GOOGLE_CLIENT_ID=...

# 4. Khởi động tất cả services
docker-compose up -d

# 5. Đợi ~30 giây cho services khởi động
sleep 30

# 6. Deploy smart contract
make deploy-contract

# 7. Truy cập: http://localhost:3000
```

### Khởi động lại (Mỗi ngày)

```bash
# Nếu đã stop trước đó
docker-compose up -d

# Đợi services ready
sleep 30

# Kiểm tra status
docker-compose ps

# Nếu backend bị lỗi, restart:
docker-compose restart backend
```

---

## 🛠️ Quy trình Thay đổi Code

### Scenario 1: Thay đổi Backend (Go)

```bash
# 1. Edit code trong backend/
# Ví dụ: backend/internal/api/treasury_handler.go

# 2. Rebuild app (backend + embedded frontend)
docker-compose build app

# 3. Restart app
docker-compose up -d app

# 4. Xem logs để debug
docker-compose logs -f app

# 5. Test API bằng curl hoặc Postman
curl http://localhost:8080/api/health

# 6. Test trên browser: http://localhost:8080

# 7. Nếu OK → Commit (xem section bên dưới)
```

### Scenario 2: Thay đổi Frontend (React)

```bash
# 1. Edit code trong frontend/
# Ví dụ: frontend/src/pages/Reports.js

# 2. Rebuild app (phải rebuild cả app vì frontend đã embedded)
docker-compose build app

# 3. Restart app
docker-compose up -d app

# 4. Xem logs để debug
docker-compose logs -f app

# 5. Truy cập: http://localhost:8080
# NOTE: Không có hot-reload, phải rebuild mỗi lần thay đổi

# 6. Test đầy đủ các chức năng liên quan

# 7. Nếu OK → Commit (xem section bên dưới)
```

### Scenario 3: Thay đổi Smart Contract

```bash
# 1. Edit code trong contracts/TreasuryLogger.sol

# 2. Deploy lại contract
make deploy-contract

# 3. Restart backend để load contract mới
docker-compose restart backend

# 4. Test blockchain logging bằng cách tạo transaction

# 5. Kiểm tra tx_hash trong database hoặc UI

# 6. Nếu OK → Commit contract + generated JSON
```

### Scenario 4: Thay đổi Database Schema

```bash
# 1. Edit migrations trong backend/internal/database/database.go

# 2. Stop containers
docker-compose down

# 3. Xóa database cũ (CẢNH BÁO: Mất data local)
docker volume rm quychung_postgres-data

# 4. Khởi động lại
docker-compose up -d

# 5. Deploy contract
make deploy-contract

# 6. Test migration thành công
docker-compose logs backend | grep "migrations completed"

# 7. Nếu OK → Commit
```

---

## ✅ Testing Checklist

### Application Testing (Backend + Frontend Embedded)

- [ ] App logs không có error: `docker-compose logs app`
- [ ] Health check OK: `curl http://localhost:8080/api/health`
- [ ] Database connection OK (xem logs)
- [ ] APIs trả về đúng format (test bằng curl/Postman)
- [ ] Frontend static files được serve: `curl -I http://localhost:8080/`
- [ ] Truy cập http://localhost:8080 không bị blank screen
- [ ] Login Google hoạt động
- [ ] Tất cả pages load được (Home, Treasury Detail, Reports)
- [ ] Các chức năng chính hoạt động:
  - [ ] Tạo quỹ mới
  - [ ] Thêm thành viên
  - [ ] Nhập giao dịch thu/chi
  - [ ] Xem báo cáo
  - [ ] Transaction lên blockchain (có tx_hash)

### Browser Console

- [ ] Mở F12 → Console tab
- [ ] Không có JavaScript errors màu đỏ
- [ ] Network tab: Tất cả API calls trả về 200 OK (không có 500/400)

---

## 📝 Git Commit Workflow

**CHỈ commit khi đã test kỹ ở local!**

### Commit Changes

```bash
# 1. Xem files đã thay đổi
git status

# 2. Review changes
git diff <file>

# 3. Stage changes
git add <file1> <file2>

# 4. Commit với message rõ ràng
git commit -m "fix: Description of the fix

- Detail 1
- Detail 2
- Detail 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"

# 5. Push to GitHub
git push origin main
```

### Commit Message Convention

```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat`: Tính năng mới
- `fix`: Sửa bug
- `refactor`: Refactor code (không thay đổi behavior)
- `docs`: Cập nhật documentation
- `chore`: Build, dependencies, configs
- `test`: Thêm hoặc sửa tests

**Examples:**

```bash
# Good
git commit -m "feat: Add export Excel functionality to Reports page"
git commit -m "fix: Reports page blank screen when no data"

# Bad
git commit -m "update"
git commit -m "fix bug"
```

---

## 🚀 Deployment to Production

**Tự động qua Devtron CI/CD**

```
Git Push → GitHub → Devtron detects → Build Docker → Deploy to AWS EKS
```

### Kiểm tra Deployment

1. **Push lên Git**:
   ```bash
   git push origin main
   ```

2. **Vào Devtron Dashboard** (link từ team)
   - Xem build status
   - Đợi build + deploy hoàn tất (~3-5 phút)

3. **Verify Production**:
   - Truy cập: https://quychung.wellytech.vn
   - Test critical flows
   - Kiểm tra logs trên Devtron nếu có lỗi

---

## 🐛 Troubleshooting

### Backend không khởi động

```bash
# Xem logs
docker-compose logs backend

# Thường gặp:
# - Database connection failed → Restart postgres
docker-compose restart postgres backend

# - Port 8080 bị chiếm → Kill process
lsof -ti:8080 | xargs kill -9
docker-compose restart backend
```

### Frontend không build

```bash
# Xem logs
docker-compose logs frontend

# Clear node_modules và rebuild
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Smart Contract không deploy

```bash
# Hardhat node chưa ready
docker-compose restart hardhat
sleep 10
make deploy-contract
```

### Database issues

```bash
# Reset database (MẤT DATA!)
docker-compose down
docker volume rm quychung_postgres-data
docker-compose up -d
make deploy-contract
```

### "Cannot connect to Docker daemon"

```bash
# Start Docker Desktop application
# Hoặc:
sudo systemctl start docker  # Linux
```

---

## 📊 Monitoring Local Development

### Watch logs real-time

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Filter by keyword
docker-compose logs backend | grep ERROR
```

### Check container status

```bash
docker-compose ps

# Should see all "Up" and "healthy"
```

### Check resource usage

```bash
docker stats
```

---

## 🔄 Daily Workflow Example

```bash
# Morning: Start working
cd quychung
docker-compose up -d
sleep 30

# Make changes
code backend/internal/api/treasury_handler.go

# Test locally
docker-compose build backend
docker-compose up -d backend
docker-compose logs -f backend
# → Visit http://localhost:3000 and test

# If OK, commit
git add backend/internal/api/treasury_handler.go
git commit -m "feat: Add new treasury export feature"
git push origin main

# Monitor Devtron for deployment

# Evening: Stop services (optional)
docker-compose down
```

---

## ⚠️ Important Rules

1. **NEVER push without local testing**
2. **ALWAYS check browser console for errors**
3. **ALWAYS test critical flows after changes**
4. **NEVER commit directly to main without testing**
5. **ALWAYS write descriptive commit messages**
6. **ALWAYS monitor Devtron after pushing**

---

## 📚 Related Documentation

- [Getting Started](GETTING_STARTED.md) - Setup lần đầu
- [Testing Guide](TESTING_GUIDE.md) - Test toàn diện
- [Deployment Checklist](../operations/DEPLOYMENT_CHECKLIST.md) - Production deployment
- [Troubleshooting](../troubleshooting/) - Debug issues

---

**Last Updated**: 2025-11-19
**Status**: ✅ Active Workflow
