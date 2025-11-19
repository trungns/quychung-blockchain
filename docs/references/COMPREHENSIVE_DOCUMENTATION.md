# Tài liệu Tổng hợp Hệ thống Quản lý Quỹ Blockchain

## Mục lục
1. [Tổng quan Hệ thống](#tổng-quan-hệ-thống)
2. [Kiến trúc Hệ thống](#kiến-trúc-hệ-thống)
3. [Tính năng Đã Phát triển](#tính-năng-đã-phát-triển)
4. [Use Cases Chính](#use-cases-chính)
5. [Prompts Quan trọng](#prompts-quan-trọng)
6. [Hướng dẫn Phát triển Tính năng Mới](#hướng-dẫn-phát-triển-tính-năng-mới)
7. [Troubleshooting](#troubleshooting)

---

## Tổng quan Hệ thống

### Mô tả
Hệ thống quản lý quỹ chung với tích hợp blockchain, cho phép:
- Quản lý nhiều quỹ (treasuries)
- Ghi nhận thu/chi với tính minh bạch
- Lưu trữ giao dịch lên blockchain Polygon Amoy Testnet
- Báo cáo thống kê đa chiều
- Xác thực Google OAuth

### Công nghệ Sử dụng
- **Frontend**: React 18, React Router v6, Axios
- **Backend**: Go 1.21, Gin framework, GORM
- **Database**: PostgreSQL
- **Blockchain**: Ethereum (go-ethereum), Polygon Amoy Testnet
- **Smart Contract**: Solidity (TreasuryLogger)
- **DevOps**: Docker multi-stage build, Kubernetes, Devtron CI/CD
- **Cloud**: AWS EKS

### Thông tin Blockchain
- **Network**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC URL**: `https://rpc-amoy.polygon.technology/`
- **Contract Address**: `0xF95395e8eFc43AA57Ef518d423AeC58f8722944e`
- **Explorer**: https://amoy.polygonscan.com/

---

## Kiến trúc Hệ thống

### Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (AWS EKS)              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Docker Container (Single Service)          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Go Binary (embedded frontend via go:embed)       │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │  Frontend (React - Static Files)           │  │  │  │
│  │  │  │  - Login/Logout                            │  │  │  │
│  │  │  │  - Treasury Management                     │  │  │  │
│  │  │  │  - Transaction Forms                       │  │  │  │
│  │  │  │  - Reports & Charts                        │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  │                                                    │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │  Backend APIs (Gin Framework)              │  │  │  │
│  │  │  │  - Auth Handler (Google OAuth)             │  │  │  │
│  │  │  │  - Treasury Handler                        │  │  │  │
│  │  │  │  - Transaction Handler                     │  │  │  │
│  │  │  │  - Report Handler                          │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  │                                                    │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │  Blockchain Service                        │  │  │  │
│  │  │  │  - Contract ABI Loader                     │  │  │  │
│  │  │  │  - Transaction Logger (async goroutine)    │  │  │  │
│  │  │  │  - Address Generator                       │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── PostgreSQL (AWS RDS)
                              │
                              └─── Polygon Amoy Testnet
                                   (Smart Contract: TreasuryLogger)
```

### Cấu trúc Thư mục

```
quychung/
├── backend/
│   ├── cmd/
│   │   ├── main.go                    # Entry point, embedded static files
│   │   └── static/                    # Frontend build (embedded via go:embed)
│   ├── internal/
│   │   ├── api/
│   │   │   ├── auth_handler.go        # Google OAuth authentication
│   │   │   ├── treasury_handler.go    # Treasury CRUD, members, balance
│   │   │   ├── transaction_handler.go # Transaction CRUD, blockchain logging
│   │   │   └── report_handler.go      # Statistics and reports
│   │   ├── database/
│   │   │   └── database.go            # GORM connection, migrations
│   │   ├── middleware/
│   │   │   └── auth.go                # JWT authentication middleware
│   │   ├── models/
│   │   │   ├── user.go                # User model
│   │   │   ├── treasury.go            # Treasury, Member models
│   │   │   ├── transaction.go         # Transaction, ChainLog models
│   │   │   └── requests.go            # API request/response DTOs
│   │   └── services/
│   │       └── blockchain_service.go  # Ethereum blockchain integration
│   ├── Dockerfile                     # Multi-stage: frontend + backend
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TransactionForm.js     # Form tạo giao dịch
│   │   │   ├── TransactionList.js     # Danh sách giao dịch
│   │   │   └── PrivateRoute.js        # Protected route wrapper
│   │   ├── pages/
│   │   │   ├── Login.js               # Google login page
│   │   │   ├── Home.js                # Danh sách quỹ
│   │   │   ├── CreateTreasury.js      # Tạo quỹ mới
│   │   │   ├── TreasuryDetail.js      # Chi tiết quỹ, giao dịch
│   │   │   └── Reports.js             # Báo cáo thống kê
│   │   ├── services/
│   │   │   └── api.js                 # Axios API client
│   │   ├── utils/
│   │   │   └── formatters.js          # Format currency, date
│   │   └── App.js                     # React Router setup
│   ├── package.json
│   └── Dockerfile                     # (Chỉ dùng cho local dev)
├── contracts/
│   ├── TreasuryLogger.sol             # Smart contract source
│   └── TreasuryLogger.json            # Deployed contract ABI + address
├── k8s/
│   ├── production/                    # Production manifests (no PostgreSQL)
│   │   ├── app-deployment.yaml
│   │   ├── app-service.yaml
│   │   ├── ingress.yaml
│   │   └── hpa.yaml
│   └── local/                         # Local manifests (with PostgreSQL)
│       └── postgres-statefulset.yaml
├── Dockerfile.combined                # (Dự phòng - build từ root)
├── docker-compose.yml                 # Local development setup
└── .gitignore                         # NOTE: TreasuryLogger.json KHÔNG bị ignore
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Treasuries table
CREATE TABLE treasuries (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    chain_address VARCHAR(42) NOT NULL, -- Ethereum address
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Members table (many-to-many: users <-> treasuries)
CREATE TABLE members (
    id UUID PRIMARY KEY,
    treasury_id UUID REFERENCES treasuries(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member', -- 'admin' or 'member'
    joined_at TIMESTAMP,
    UNIQUE(treasury_id, user_id)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    treasury_id UUID REFERENCES treasuries(id),
    type VARCHAR(20) NOT NULL, -- 'INCOME' or 'EXPENSE'
    amount_token DECIMAL(20,8) NOT NULL, -- Amount in tokens
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP
);

-- ChainLogs table (blockchain transaction records)
CREATE TABLE chain_logs (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) UNIQUE,
    tx_hash VARCHAR(66), -- Blockchain transaction hash
    detail_hash VARCHAR(66), -- Hash of transaction details
    block_number BIGINT,
    status VARCHAR(20), -- 'pending', 'confirmed', 'failed'
    created_at TIMESTAMP
);
```

---

## Tính năng Đã Phát triển

### ✅ Checklist Tính năng

#### 1. Authentication & Authorization
- [x] Google OAuth 2.0 integration
- [x] JWT token-based authentication
- [x] Protected routes (frontend + backend)
- [x] User session management
- [x] Automatic token refresh

#### 2. Treasury Management
- [x] Tạo quỹ mới với blockchain address tự động
- [x] Xem danh sách quỹ của user
- [x] Xem chi tiết quỹ
- [x] Thêm thành viên vào quỹ (by email)
- [x] Phân quyền: admin/member
- [x] Tính tổng thu/chi/số dư theo quỹ

#### 3. Transaction Management
- [x] Tạo giao dịch thu (INCOME)
- [x] Tạo giao dịch chi (EXPENSE)
- [x] Lưu giao dịch vào database
- [x] Ghi giao dịch lên blockchain (async)
- [x] Tracking trạng thái blockchain: pending/confirmed/failed
- [x] Hiển thị transaction hash từ blockchain
- [x] View transaction trên Polygon Explorer
- [x] Danh sách giao dịch theo quỹ (sắp xếp mới nhất)
- [x] Preload creator và chain_log info

#### 4. Blockchain Integration
- [x] Smart contract deployment (TreasuryLogger)
- [x] Contract ABI loading từ JSON file
- [x] Generate Ethereum addresses cho treasuries
- [x] Log transactions lên Polygon Amoy testnet
- [x] Create detail hash (Keccak256)
- [x] Sign và send transactions
- [x] Error handling cho blockchain operations
- [x] Async goroutine cho blockchain logging (không block API)

#### 5. Reports & Analytics
- [x] Tổng thu theo thành viên (monthly breakdown)
- [x] Tổng chi theo tháng
- [x] Tổng kết theo năm
- [x] Top contributors (người đóng góp nhiều nhất)
- [x] Filter theo năm
- [x] Visualize với charts (frontend)

#### 6. UI/UX
- [x] Responsive design
- [x] Loading states ("Đang xử lý...")
- [x] Error messages tiếng Việt
- [x] Currency formatting (VNĐ)
- [x] Date formatting
- [x] Modal dialogs cho forms
- [x] Transaction status badges
- [x] Blockchain explorer links

#### 7. DevOps & Deployment
- [x] Docker multi-stage build (frontend embedded)
- [x] Kubernetes manifests (production + local)
- [x] Horizontal Pod Autoscaler (HPA)
- [x] Ingress configuration
- [x] AWS EKS deployment
- [x] Devtron CI/CD auto-build on Git push
- [x] Environment-based configuration
- [x] Secret management
- [x] Production RDS PostgreSQL
- [x] CORS configuration cho production

#### 8. Code Quality & Debugging
- [x] Comprehensive logging (DEBUG, ERROR, SUCCESS)
- [x] Error handling với proper messages
- [x] Input validation
- [x] Database transaction safety (BEGIN/COMMIT/ROLLBACK)
- [x] Context cancellation support
- [x] Graceful error recovery

---

## Use Cases Chính

### UC-01: Đăng nhập với Google
**Actors**: User

**Preconditions**: User có Google account

**Main Flow**:
1. User truy cập trang login
2. User click "Đăng nhập với Google"
3. Hệ thống redirect đến Google OAuth consent screen
4. User cho phép ứng dụng truy cập thông tin cơ bản
5. Google redirect về callback URL với authorization code
6. Backend trao đổi code lấy access token từ Google
7. Backend lấy thông tin user (email, name, avatar) từ Google
8. Backend tạo/update user trong database
9. Backend tạo JWT token
10. Frontend lưu token vào localStorage
11. Frontend redirect đến trang Home

**Postconditions**: User đã authenticated, có thể truy cập các trang protected

### UC-02: Tạo Quỹ Mới
**Actors**: Authenticated User

**Preconditions**: User đã đăng nhập

**Main Flow**:
1. User click "Tạo quỹ mới" trên trang Home
2. Hệ thống hiển thị form tạo quỹ
3. User nhập:
   - Tên quỹ (required)
   - Mô tả (optional)
4. User submit form
5. Backend validate input
6. Backend generate một Ethereum address cho quỹ
7. Backend tạo treasury record với:
   - ID: UUID mới
   - Name: tên user nhập
   - Description: mô tả user nhập
   - ChainAddress: address vừa generate
   - CreatedBy: user ID
8. Backend tự động thêm creator làm member với role "admin"
9. Backend response treasury data
10. Frontend redirect đến trang chi tiết quỹ

**Postconditions**:
- Có 1 treasury mới trong database
- Creator là admin của treasury
- Treasury có blockchain address riêng

### UC-03: Thêm Giao dịch Thu/Chi
**Actors**: Treasury Member

**Preconditions**:
- User là member của treasury
- User đã đăng nhập

**Main Flow**:
1. User vào trang chi tiết quỹ
2. User click "Nhập thu" hoặc "Nhập chi"
3. Hệ thống hiển thị modal form
4. User nhập:
   - Số tiền (required, > 0)
   - Ghi chú (optional)
5. User click "Xác nhận"
6. Frontend gọi API POST `/api/treasuries/{id}/transactions`
7. Backend validate:
   - User có phải member của treasury không
   - Amount hợp lệ
   - Type là INCOME hoặc EXPENSE
8. Backend BEGIN database transaction
9. Backend tạo Transaction record:
   - ID: UUID mới
   - TreasuryID: ID của quỹ
   - Type: INCOME hoặc EXPENSE
   - AmountToken: số tiền user nhập
   - Note: ghi chú user nhập
   - CreatedBy: user ID
   - CreatedAt: timestamp hiện tại
10. Backend tạo ChainLog record với status "pending"
11. Backend COMMIT database transaction
12. Backend response transaction data về frontend (status: pending)
13. Frontend đóng modal, reload danh sách transactions
14. **Async (trong goroutine riêng)**:
    a. Backend load contract ABI từ `contracts/TreasuryLogger.json`
    b. Backend tạo detail hash từ transaction data (Keccak256)
    c. Backend convert amount sang wei (x 10^18)
    d. Backend pack dữ liệu theo ABI method `logTransaction(address,uint256,bool,bytes32)`
    e. Backend sign transaction với private key
    f. Backend send transaction lên Polygon Amoy RPC
    g. **Nếu thành công**:
       - Update ChainLog: tx_hash, detail_hash, status "confirmed"
       - Log SUCCESS message
    h. **Nếu thất bại**:
       - Update ChainLog: status "failed"
       - Log ERROR message với chi tiết lỗi
15. Frontend tự động poll/reload để cập nhật status

**Postconditions**:
- Transaction được lưu trong database
- ChainLog có status "confirmed" và tx_hash (nếu blockchain thành công)
- Transaction được ghi trên Polygon Amoy blockchain
- Balance của treasury được cập nhật

**Alternative Flow 14h (Blockchain Failed)**:
- ChainLog status = "failed"
- Transaction vẫn tồn tại trong database
- User có thể thấy trạng thái failed trên UI

### UC-04: Xem Báo Cáo Thống Kê
**Actors**: Treasury Member

**Preconditions**:
- User là member của treasury
- Treasury có ít nhất 1 transaction

**Main Flow**:
1. User vào trang chi tiết quỹ
2. User click "📊 Báo cáo"
3. Frontend redirect đến `/treasury/{id}/reports`
4. Frontend gọi 4 API song song:
   - GET `/api/treasuries/{id}/reports/income-by-member?year=2025`
   - GET `/api/treasuries/{id}/reports/monthly-expense?year=2025`
   - GET `/api/treasuries/{id}/reports/yearly-summary`
   - GET `/api/treasuries/{id}/reports/top-contributors?limit=10`
5. Backend xử lý từng API:
   - **Income by Member**: GROUP BY creator, month → tổng thu theo người và tháng
   - **Monthly Expense**: GROUP BY month → tổng chi theo tháng
   - **Yearly Summary**: Tính sum theo năm cho từng loại transaction
   - **Top Contributors**: ORDER BY tổng thu DESC, LIMIT 10
6. Frontend nhận data và render:
   - Bar chart: Thu theo thành viên
   - Line chart: Chi theo tháng
   - Summary cards: Tổng thu/chi/số dư
   - Leaderboard: Top 10 contributors

**Postconditions**: User thấy được báo cáo trực quan về tình hình tài chính quỹ

### UC-05: Thêm Thành Viên vào Quỹ
**Actors**: Treasury Admin

**Preconditions**:
- User là admin của treasury
- User biết email của người muốn thêm

**Main Flow**:
1. User vào trang chi tiết quỹ
2. User click "+ Thêm thành viên"
3. Hệ thống hiển thị modal form
4. User nhập email của người muốn thêm
5. User submit form
6. Frontend gọi API POST `/api/treasuries/{id}/members`
7. Backend validate:
   - User có phải admin của treasury không
   - Email có tồn tại trong hệ thống không
   - User đã là member chưa
8. Backend tìm user theo email
9. Backend tạo Member record:
   - TreasuryID: ID của quỹ
   - UserID: ID của user được thêm
   - Role: "member"
   - JoinedAt: timestamp hiện tại
10. Backend response thành công
11. Frontend reload danh sách members

**Postconditions**: User mới trở thành member, có thể xem và thêm transactions

---

## Prompts Quan trọng

### Prompt Template: Thêm Tính năng Mới

```
Tôi muốn thêm tính năng [TÊN TÍNH NĂNG] vào hệ thống Quản lý Quỹ Blockchain.

CONTEXT:
- Hệ thống hiện tại: Go backend + React frontend + PostgreSQL + Blockchain
- Stack: Gin, GORM, go-ethereum, React, Axios
- Deployment: Kubernetes (AWS EKS) với Devtron CI/CD

YÊU CẦU:
1. [Mô tả chi tiết tính năng]
2. [Actors và permissions]
3. [Input/Output mong muốn]

VÍ DỤ:
Ví dụ: Thêm tính năng "Export transactions to Excel"
- User là member của treasury
- Click button "Export Excel" trên trang chi tiết quỹ
- Download file Excel chứa tất cả transactions của quỹ

IMPLEMENTATION NOTES:
- Backend: Cần thêm endpoint mới vào file nào?
- Frontend: Cần component/page nào?
- Database: Có cần migration không?
- Blockchain: Có tương tác với smart contract không?

Hãy:
1. Phân tích use case
2. Thiết kế API endpoint (nếu cần)
3. Implement backend handler
4. Implement frontend component
5. Test và debug
6. Commit với message rõ ràng
```

### Prompt: Debug Blockchain Transaction Failed

```
Giao dịch blockchain đang bị lỗi với status "failed" trong chain_logs.

DEBUG CHECKLIST:
1. Kiểm tra logs của pod:
   - Tìm log "ERROR: Failed to log transaction"
   - Xem chi tiết error message

2. Kiểm tra contract file:
   ```bash
   ls -la contracts/TreasuryLogger.json
   # File phải tồn tại và có size > 0
   ```

3. Kiểm tra contract được load:
   - Tìm log "DEBUG: Successfully read contract file, size: XXX bytes"
   - Tìm log "DEBUG: Contract ABI parsed successfully"

4. Kiểm tra RPC connection:
   - Verify BLOCKCHAIN_RPC environment variable
   - Test RPC: curl https://rpc-amoy.polygon.technology/

5. Kiểm tra private key:
   - Verify TREASURY_PRIVATE_KEY có đúng format không
   - Key phải có đủ gas (MATIC) trên Polygon Amoy

6. Kiểm tra contract ABI match:
   ```bash
   cat contracts/TreasuryLogger.json | jq '.abi[] | select(.name == "logTransaction")'
   # Verify method signature
   ```

7. Common issues:
   - File TreasuryLogger.json bị gitignore → Fix: Remove khỏi .gitignore
   - RPC URL sai → Fix: Update env var
   - Hết gas → Fix: Request testnet MATIC từ faucet
   - Method signature sai → Fix: Redeploy contract hoặc update ABI
```

### Prompt: Thêm Report Mới

```
Tôi muốn thêm báo cáo mới: [TÊN BÁO CÁO]

VÍ DỤ: "Báo cáo chi tiết theo loại chi tiêu"

BƯỚC 1: Backend API
File: `backend/internal/api/report_handler.go`

```go
// Get[TênBáoCáo] handles GET /api/treasuries/:id/reports/[endpoint]
func (h *ReportHandler) Get[TênBáoCáo](c *gin.Context) {
    treasuryID := c.Param("id")
    userID, _ := middleware.GetUserID(c)

    // Check membership
    var member models.Member
    if err := database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).
        First(&member).Error; err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
        return
    }

    // Query data
    var results []YourResultStruct
    query := `
        SELECT
            [columns]
        FROM transactions
        WHERE treasury_id = ?
        GROUP BY [grouping]
        ORDER BY [ordering]
    `
    database.DB.Raw(query, treasuryID).Scan(&results)

    c.JSON(http.StatusOK, results)
}
```

BƯỚC 2: Register Route
File: `backend/cmd/main.go`

```go
protected.GET("/treasuries/:id/reports/[endpoint]", reportHandler.Get[TênBáoCáo])
```

BƯỚC 3: Frontend API Call
File: `frontend/src/services/api.js`

```javascript
export const reportAPI = {
    // ... existing reports
    get[TênBáoCáo]: (treasuryId, params) =>
        api.get(`/treasuries/${treasuryId}/reports/[endpoint]`, { params }),
};
```

BƯỚC 4: Frontend Component
File: `frontend/src/pages/Reports.js`

```javascript
const [dataName, setDataName] = useState([]);

useEffect(() => {
    const loadData = async () => {
        const res = await reportAPI.get[TênBáoCáo](id, { year: 2025 });
        setDataName(res.data);
    };
    loadData();
}, [id]);
```

BƯỚC 5: Test
- Tạo vài transactions test
- Gọi API kiểm tra response
- Verify data hiển thị đúng trên UI
```

### Prompt: Deploy Production Change

```
Tôi đã thay đổi code và muốn deploy lên production.

CHECKLIST TRƯỚC KHI DEPLOY:

1. ✅ Code đã được test locally
2. ✅ Không có hardcoded secrets
3. ✅ Environment variables đã được cấu hình trên Devtron
4. ✅ Database migrations (nếu có) đã được review

DEPLOYMENT PROCESS:

1. Commit changes:
```bash
git add .
git status  # Review changes
git commit -m "feat: [mô tả ngắn gọn]

[Chi tiết thay đổi]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

2. Push to Git:
```bash
git push origin main
```

3. Devtron auto-build:
   - Devtron phát hiện Git push
   - Trigger Docker build từ Dockerfile
   - Build context: project root
   - Dockerfile path: `backend/Dockerfile`

4. Monitor build:
   - Vào Devtron Dashboard
   - Xem logs của CI pipeline
   - Đợi build thành công (~5-10 phút)

5. Verify deployment:
   - Check pod logs trên Devtron
   - Tìm "Server starting on port 8080"
   - Tìm "DEBUG: Contract ABI parsed successfully"
   - Test trên production URL: https://quychung.wellytech.vn

6. Test production:
   - Login với Google
   - Tạo 1 transaction test
   - Verify status chuyển từ "pending" → "confirmed"
   - Check transaction trên PolygonScan

ROLLBACK (nếu có lỗi):
```bash
# Revert commit
git revert HEAD
git push origin main

# Hoặc rollback trên Devtron UI
# Click "Rollback" → Chọn version trước đó
```
```

---

## Hướng dẫn Phát triển Tính năng Mới

### Quy trình Chung

```
1. DESIGN
   ├─ Xác định use case
   ├─ Vẽ flow diagram
   ├─ Thiết kế API contract
   └─ Review database schema changes

2. BACKEND
   ├─ Update models (nếu cần)
   ├─ Viết migration (nếu cần)
   ├─ Implement handler
   ├─ Register route
   └─ Test với Postman/curl

3. FRONTEND
   ├─ Update api.js
   ├─ Create/update components
   ├─ Update pages
   ├─ Add styling
   └─ Test trên browser

4. INTEGRATION
   ├─ Test end-to-end flow
   ├─ Fix bugs
   └─ Optimize performance

5. DEPLOY
   ├─ Commit với message rõ ràng
   ├─ Push lên Git
   ├─ Monitor Devtron build
   └─ Verify trên production
```

### Ví dụ Cụ thể: Thêm tính năng "Chỉnh sửa Transaction"

#### 1. DESIGN

**Use Case**: Member có thể sửa amount và note của transaction đã tạo (trong vòng 24h)

**API Design**:
```
PATCH /api/treasuries/:treasury_id/transactions/:transaction_id
Body: {
    "amount_token": 150000,
    "note": "Updated note"
}
Response: { ...updated transaction }
```

**Database**: Không cần thay đổi schema

#### 2. BACKEND

**File**: `backend/internal/api/transaction_handler.go`

```go
// UpdateTransaction updates a transaction
func (h *TransactionHandler) UpdateTransaction(c *gin.Context) {
    treasuryID := c.Param("treasury_id")
    transactionID := c.Param("transaction_id")
    userID, _ := middleware.GetUserID(c)

    // Check membership
    var member models.Member
    if err := database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).
        First(&member).Error; err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not a member"})
        return
    }

    // Get transaction
    var transaction models.Transaction
    if err := database.DB.First(&transaction, "id = ? AND treasury_id = ?",
        transactionID, treasuryID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
        return
    }

    // Check if user is creator
    if transaction.CreatedBy != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "Only creator can edit"})
        return
    }

    // Check if within 24 hours
    if time.Since(transaction.CreatedAt) > 24*time.Hour {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Can only edit within 24 hours"})
        return
    }

    // Parse request
    var req struct {
        AmountToken float64 `json:"amount_token" binding:"required,gt=0"`
        Note        string  `json:"note"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Update transaction
    transaction.AmountToken = req.AmountToken
    transaction.Note = req.Note

    if err := database.DB.Save(&transaction).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
        return
    }

    database.DB.Preload("Creator").Preload("ChainLog").First(&transaction, transaction.ID)
    c.JSON(http.StatusOK, transaction)
}
```

**Register Route** (`backend/cmd/main.go`):
```go
protected.PATCH("/treasuries/:treasury_id/transactions/:transaction_id",
    transactionHandler.UpdateTransaction)
```

#### 3. FRONTEND

**Update API** (`frontend/src/services/api.js`):
```javascript
export const transactionAPI = {
    // ... existing methods
    update: (treasuryId, transactionId, data) =>
        api.patch(`/treasuries/${treasuryId}/transactions/${transactionId}`, data),
};
```

**Update Component** (`frontend/src/components/TransactionList.js`):
```javascript
const [editingId, setEditingId] = useState(null);
const [editForm, setEditForm] = useState({ amount_token: '', note: '' });

const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({
        amount_token: transaction.amount_token,
        note: transaction.note
    });
};

const handleSaveEdit = async (treasuryId, transactionId) => {
    try {
        await transactionAPI.update(treasuryId, transactionId, editForm);
        setEditingId(null);
        // Reload transactions
        loadTransactions();
    } catch (error) {
        alert('Failed to update transaction');
    }
};

// In render:
{transactions.map(tx => (
    <div key={tx.id}>
        {editingId === tx.id ? (
            <div>
                <input
                    value={editForm.amount_token}
                    onChange={e => setEditForm({...editForm, amount_token: e.target.value})}
                />
                <input
                    value={editForm.note}
                    onChange={e => setEditForm({...editForm, note: e.target.value})}
                />
                <button onClick={() => handleSaveEdit(treasuryId, tx.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
            </div>
        ) : (
            <div>
                {tx.amount_token} - {tx.note}
                {canEdit(tx) && <button onClick={() => handleEdit(tx)}>Edit</button>}
            </div>
        )}
    </div>
))}
```

#### 4. TEST & DEPLOY

```bash
# Test locally
# 1. Start backend
cd backend && go run cmd/main.go

# 2. Test API với curl
curl -X PATCH http://localhost:8080/api/treasuries/{id}/transactions/{txId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"amount_token": 150000, "note": "Updated"}'

# 3. Test frontend
cd frontend && npm start

# 4. Deploy
git add .
git commit -m "feat: Add transaction edit functionality"
git push origin main
```

---

## Troubleshooting

### Vấn đề 1: Transaction Status Stuck at "pending"

**Triệu chứng**: ChainLog.status luôn là "pending", không chuyển sang "confirmed"

**Nguyên nhân & Giải pháp**:

1. **Contract file không có trong Docker image**
   ```bash
   # Check trong pod logs
   grep "Contract not loaded" pod-logs.txt

   # Fix: Ensure contracts/TreasuryLogger.json NOT in .gitignore
   # Commit file to Git
   git add contracts/TreasuryLogger.json
   git commit -m "fix: Add contract JSON to Git"
   git push
   ```

2. **RPC connection failed**
   ```bash
   # Test RPC
   curl -X POST https://rpc-amoy.polygon.technology/ \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

   # Fix: Update BLOCKCHAIN_RPC env var on Devtron
   ```

3. **Insufficient gas**
   ```
   # Get testnet MATIC từ faucet
   https://faucet.polygon.technology/

   # Paste địa chỉ wallet (từ TREASURY_PRIVATE_KEY)
   ```

4. **Wrong ABI method signature**
   ```bash
   # Verify ABI
   cat contracts/TreasuryLogger.json | jq '.abi[] | select(.name == "logTransaction")'

   # Expected:
   # - address _treasury
   # - uint256 _amountToken
   # - bool _isIncome
   # - bytes32 _detailHash
   ```

### Vấn đề 2: CORS Error trên Production

**Triệu chứng**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Nguyên nhân**: Frontend và backend ở khác origin, CORS không được cấu hình đúng

**Giải pháp**:

1. **Check CORS config** (`backend/cmd/main.go`):
   ```go
   router.Use(cors.New(cors.Config{
       AllowOrigins: []string{
           "http://localhost:3000",
           "https://quychung.wellytech.vn",  // ADD production domain
       },
       AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
       AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
       AllowCredentials: true,
   }))
   ```

2. **Frontend API URL** (`frontend/src/services/api.js`):
   ```javascript
   // Use relative path for production (same origin)
   const API_URL = process.env.REACT_APP_API_URL || '';
   ```

### Vấn đề 3: Google OAuth Redirect URI Mismatch

**Triệu chứng**:
```
Error 400: redirect_uri_mismatch
```

**Giải pháp**:

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Chọn OAuth 2.0 Client ID
4. Thêm Authorized redirect URIs:
   ```
   http://localhost:8080/api/auth/google/callback
   https://quychung.wellytech.vn/api/auth/google/callback
   ```
5. Save

### Vấn đề 4: Pod CrashLoopBackOff

**Triệu chứng**: Pod không thể start, liên tục restart

**Debug**:
```bash
# Get pod logs
kubectl logs <pod-name> -n <namespace>

# Hoặc dùng Devtron UI: Logs tab
```

**Nguyên nhân thường gặp**:

1. **Database connection failed**
   ```
   ERROR: Failed to connect to database
   ```
   Fix: Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD secrets

2. **Missing environment variables**
   ```
   TREASURY_PRIVATE_KEY not set
   ```
   Fix: Add secret trên Devtron

3. **Port already in use**
   Fix: Check service configuration

### Vấn đề 5: Slow API Response

**Triệu chứng**: API mất > 2 giây để response

**Optimization**:

1. **Add database indexes**:
   ```sql
   CREATE INDEX idx_transactions_treasury_id ON transactions(treasury_id);
   CREATE INDEX idx_transactions_created_at ON transactions(created_at);
   CREATE INDEX idx_members_treasury_user ON members(treasury_id, user_id);
   ```

2. **Use preload instead of N+1 queries**:
   ```go
   // Bad
   database.DB.Find(&transactions)
   for _, tx := range transactions {
       database.DB.First(&tx.Creator, tx.CreatedBy)  // N queries
   }

   // Good
   database.DB.Preload("Creator").Preload("ChainLog").Find(&transactions)
   ```

3. **Add pagination**:
   ```go
   page := c.DefaultQuery("page", "1")
   limit := c.DefaultQuery("limit", "20")
   offset := (page - 1) * limit

   database.DB.Limit(limit).Offset(offset).Find(&transactions)
   ```

---

## Tài liệu Tham khảo

### Smart Contract
- **Source**: `contracts/TreasuryLogger.sol`
- **Deployed Address**: `0xF95395e8eFc43AA57Ef518d423AeC58f8722944e`
- **Network**: Polygon Amoy Testnet
- **Explorer**: https://amoy.polygonscan.com/address/0xF95395e8eFc43AA57Ef518d423AeC58f8722944e

### API Endpoints

#### Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/google-login` - Login with Google credential

#### Treasuries
- `POST /api/treasuries` - Create treasury
- `GET /api/treasuries` - List user's treasuries
- `GET /api/treasuries/:id` - Get treasury details
- `POST /api/treasuries/:id/members` - Add member
- `GET /api/treasuries/:id/balance` - Get balance

#### Transactions
- `POST /api/treasuries/:id/transactions` - Create transaction
- `GET /api/treasuries/:id/transactions` - List transactions

#### Reports
- `GET /api/treasuries/:id/reports/income-by-member?year=2025`
- `GET /api/treasuries/:id/reports/monthly-expense?year=2025`
- `GET /api/treasuries/:id/reports/yearly-summary`
- `GET /api/treasuries/:id/reports/top-contributors?limit=10`

### Environment Variables

#### Backend (.env hoặc Kubernetes Secrets)
```bash
# Database
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=quychung_db

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URL=https://quychung.wellytech.vn/api/auth/google/callback

# JWT
JWT_SECRET=your-super-secret-key-here

# Blockchain
BLOCKCHAIN_RPC=https://rpc-amoy.polygon.technology/
TREASURY_PRIVATE_KEY=0xYourPrivateKeyHere

# App
PORT=8080
```

#### Frontend (.env)
```bash
REACT_APP_API_URL=
REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## Kết luận

Tài liệu này cung cấp:
- ✅ Tổng quan kiến trúc hệ thống
- ✅ Checklist đầy đủ các tính năng đã phát triển
- ✅ Use cases chi tiết cho các flows chính
- ✅ Prompts template để phát triển tính năng mới
- ✅ Hướng dẫn implementation cụ thể
- ✅ Troubleshooting guide cho các vấn đề thường gặp
- ✅ Reference docs cho APIs và configs

**Cách sử dụng tài liệu này**:
1. Khi cần thêm tính năng mới → Xem section "Prompts Quan trọng"
2. Khi gặp lỗi → Xem section "Troubleshooting"
3. Khi cần hiểu flow → Xem section "Use Cases Chính"
4. Khi cần API reference → Xem section "API Endpoints"

**Lưu ý quan trọng**:
- File `contracts/TreasuryLogger.json` PHẢI được commit vào Git
- Blockchain logging chạy async, không block API response
- Production build từ Dockerfile ở `backend/Dockerfile` với context là project root
- Devtron auto-build khi detect Git push lên branch `main`

---

*Tài liệu được tạo bởi Claude Code - Cập nhật lần cuối: 2025-11-19*
