# API Reference - Hệ thống Quản lý Quỹ

## Base URL
- **Development**: `http://localhost:8080/api`
- **Production**: `https://quychung.wellytech.vn/api`

## Authentication

Tất cả endpoints (trừ auth) yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

---

## Auth APIs

### 1. Get Google OAuth URL
```http
GET /api/auth/google
```

**Response**:
```json
{
  "url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### 2. Google OAuth Callback
```http
GET /api/auth/google/callback?code=xxx&state=xxx
```

**Response**: Redirect với query param `token=xxx`

### 3. Login with Google Credential
```http
POST /api/auth/google-login
Content-Type: application/json

{
  "credential": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar_url": "https://..."
  }
}
```

---

## Treasury APIs

### 1. Create Treasury
```http
POST /api/treasuries
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Quỹ lớp 12A1",
  "description": "Quỹ chung lớp 12A1 năm học 2024-2025"
}
```

**Response**:
```json
{
  "id": "uuid",
  "name": "Quỹ lớp 12A1",
  "description": "Quỹ chung lớp 12A1 năm học 2024-2025",
  "created_by": "user-uuid",
  "chain_address": "0x1234...5678",
  "created_at": "2025-01-19T10:30:00Z",
  "updated_at": "2025-01-19T10:30:00Z",
  "creator": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "members": [
    {
      "id": "member-uuid",
      "treasury_id": "uuid",
      "user_id": "user-uuid",
      "role": "admin",
      "joined_at": "2025-01-19T10:30:00Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "User Name"
      }
    }
  ]
}
```

### 2. Get User's Treasuries
```http
GET /api/treasuries
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Quỹ lớp 12A1",
    "description": "...",
    "created_by": "user-uuid",
    "chain_address": "0x1234...5678",
    "creator": {...},
    "members": [...]
  }
]
```

### 3. Get Treasury Details
```http
GET /api/treasuries/:id
Authorization: Bearer <token>
```

**Response**: Same as create treasury response

### 4. Add Member to Treasury
```http
POST /api/treasuries/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "member@example.com"
}
```

**Response**:
```json
{
  "id": "member-uuid",
  "treasury_id": "treasury-uuid",
  "user_id": "user-uuid",
  "role": "member",
  "joined_at": "2025-01-19T10:30:00Z",
  "user": {
    "id": "user-uuid",
    "email": "member@example.com",
    "name": "Member Name"
  }
}
```

**Errors**:
- `403`: "Only admins can add members"
- `400`: "User not found"
- `400`: "User is already a member"

### 5. Get Treasury Balance
```http
GET /api/treasuries/:id/balance
Authorization: Bearer <token>
```

**Response**:
```json
{
  "treasury_id": "uuid",
  "total_income": 5000000.0,
  "total_expense": 2000000.0,
  "balance": 3000000.0
}
```

---

## Transaction APIs

### 1. Create Transaction
```http
POST /api/treasuries/:id/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "INCOME",
  "amount_token": 100000.0,
  "note": "Đóng quỹ tháng 1"
}
```

**Request Fields**:
- `type`: "INCOME" hoặc "EXPENSE" (required)
- `amount_token`: Số tiền (required, > 0)
- `note`: Ghi chú (optional)

**Response**:
```json
{
  "id": "transaction-uuid",
  "treasury_id": "treasury-uuid",
  "type": "INCOME",
  "amount_token": 100000.0,
  "note": "Đóng quỹ tháng 1",
  "created_by": "user-uuid",
  "created_at": "2025-01-19T10:30:00Z",
  "creator": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "chain_log": {
    "id": "chainlog-uuid",
    "transaction_id": "transaction-uuid",
    "tx_hash": "",
    "detail_hash": "",
    "block_number": 0,
    "status": "pending",
    "created_at": "2025-01-19T10:30:00Z"
  }
}
```

**Note**:
- `chain_log.status` ban đầu là "pending"
- Sau vài giây sẽ chuyển thành "confirmed" (với tx_hash) hoặc "failed"
- Blockchain logging chạy async, không block API response

### 2. Get Transactions
```http
GET /api/treasuries/:id/transactions
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "transaction-uuid",
    "treasury_id": "treasury-uuid",
    "type": "INCOME",
    "amount_token": 100000.0,
    "note": "Đóng quỹ tháng 1",
    "created_by": "user-uuid",
    "created_at": "2025-01-19T10:30:00Z",
    "creator": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatar_url": "https://..."
    },
    "chain_log": {
      "id": "chainlog-uuid",
      "transaction_id": "transaction-uuid",
      "tx_hash": "0xabc123...",
      "detail_hash": "0xdef456...",
      "block_number": 12345678,
      "status": "confirmed",
      "created_at": "2025-01-19T10:30:00Z"
    }
  }
]
```

**Ordering**: Descending by `created_at` (newest first)

---

## Report APIs

### 1. Income by Member
```http
GET /api/treasuries/:id/reports/income-by-member?year=2025
Authorization: Bearer <token>
```

**Query Params**:
- `year`: Năm cần lọc (optional, default: current year)

**Response**:
```json
[
  {
    "creator_id": "user-uuid",
    "creator_name": "User Name",
    "creator_email": "user@example.com",
    "month": 1,
    "year": 2025,
    "total_amount": 500000.0
  },
  {
    "creator_id": "user-uuid",
    "creator_name": "User Name",
    "creator_email": "user@example.com",
    "month": 2,
    "year": 2025,
    "total_amount": 500000.0
  }
]
```

### 2. Monthly Expense
```http
GET /api/treasuries/:id/reports/monthly-expense?year=2025
Authorization: Bearer <token>
```

**Query Params**:
- `year`: Năm cần lọc (optional, default: current year)

**Response**:
```json
[
  {
    "month": 1,
    "year": 2025,
    "total_expense": 150000.0
  },
  {
    "month": 2,
    "year": 2025,
    "total_expense": 200000.0
  }
]
```

### 3. Yearly Summary
```http
GET /api/treasuries/:id/reports/yearly-summary
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "year": 2025,
    "total_income": 6000000.0,
    "total_expense": 2000000.0,
    "balance": 4000000.0
  },
  {
    "year": 2024,
    "total_income": 5000000.0,
    "total_expense": 3000000.0,
    "balance": 2000000.0
  }
]
```

### 4. Top Contributors
```http
GET /api/treasuries/:id/reports/top-contributors?limit=10
Authorization: Bearer <token>
```

**Query Params**:
- `limit`: Số lượng top contributors (optional, default: 10)

**Response**:
```json
[
  {
    "creator_id": "user-uuid",
    "creator_name": "User Name",
    "creator_email": "user@example.com",
    "total_contributed": 1500000.0
  },
  {
    "creator_id": "user2-uuid",
    "creator_name": "User 2 Name",
    "creator_email": "user2@example.com",
    "total_contributed": 1200000.0
  }
]
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User không có quyền thực hiện action |
| 404 | Not Found | Resource không tồn tại |
| 500 | Internal Server Error | Server error |

### Error Examples

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden**:
```json
{
  "error": "Not a member of this treasury"
}
```

**400 Bad Request**:
```json
{
  "error": "Invalid transaction type"
}
```

---

## Data Models

### User
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Full Name",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "created_at": "2025-01-19T10:30:00Z",
  "updated_at": "2025-01-19T10:30:00Z"
}
```

### Treasury
```json
{
  "id": "uuid",
  "name": "Treasury Name",
  "description": "Description text",
  "created_by": "user-uuid",
  "chain_address": "0x1234567890abcdef...",
  "created_at": "2025-01-19T10:30:00Z",
  "updated_at": "2025-01-19T10:30:00Z",
  "creator": { User },
  "members": [ Member ]
}
```

### Member
```json
{
  "id": "uuid",
  "treasury_id": "treasury-uuid",
  "user_id": "user-uuid",
  "role": "admin", // hoặc "member"
  "joined_at": "2025-01-19T10:30:00Z",
  "user": { User }
}
```

### Transaction
```json
{
  "id": "uuid",
  "treasury_id": "treasury-uuid",
  "type": "INCOME", // hoặc "EXPENSE"
  "amount_token": 100000.0,
  "note": "Optional note",
  "created_by": "user-uuid",
  "created_at": "2025-01-19T10:30:00Z",
  "creator": { User },
  "chain_log": { ChainLog }
}
```

### ChainLog
```json
{
  "id": "uuid",
  "transaction_id": "transaction-uuid",
  "tx_hash": "0xabc123...", // null nếu pending/failed
  "detail_hash": "0xdef456...", // null nếu pending/failed
  "block_number": 12345678, // 0 nếu pending/failed
  "status": "confirmed", // "pending", "confirmed", hoặc "failed"
  "created_at": "2025-01-19T10:30:00Z"
}
```

---

## Testing với cURL

### 1. Login
```bash
# Lấy token từ Google (manual flow)
# Sau khi login thành công, copy token từ localStorage
TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### 2. Create Treasury
```bash
curl -X POST http://localhost:8080/api/treasuries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Treasury",
    "description": "For testing"
  }'
```

### 3. Create Transaction
```bash
TREASURY_ID="uuid-from-previous-response"

curl -X POST "http://localhost:8080/api/treasuries/$TREASURY_ID/transactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INCOME",
    "amount_token": 50000,
    "note": "Test transaction"
  }'
```

### 4. Get Transactions
```bash
curl -X GET "http://localhost:8080/api/treasuries/$TREASURY_ID/transactions" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Reports
```bash
# Income by member
curl -X GET "http://localhost:8080/api/treasuries/$TREASURY_ID/reports/income-by-member?year=2025" \
  -H "Authorization: Bearer $TOKEN"

# Monthly expense
curl -X GET "http://localhost:8080/api/treasuries/$TREASURY_ID/reports/monthly-expense?year=2025" \
  -H "Authorization: Bearer $TOKEN"

# Top contributors
curl -X GET "http://localhost:8080/api/treasuries/$TREASURY_ID/reports/top-contributors?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rate Limiting

Hiện tại chưa implement rate limiting. Trong production, nên thêm:
- Max 100 requests/minute per user
- Max 10 transactions/minute per treasury

---

## Changelog

### Version 1.0.0 (2025-01-19)
- ✅ Initial release
- ✅ Google OAuth authentication
- ✅ Treasury CRUD operations
- ✅ Transaction management với blockchain integration
- ✅ Reports & analytics
- ✅ Member management

---

*API Reference - Cập nhật lần cuối: 2025-01-19*
