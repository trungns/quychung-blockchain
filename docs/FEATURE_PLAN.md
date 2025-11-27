# KẾ HOẠCH PHÁT TRIỂN TÍNH NĂNG MỚI

**Ngày tạo:** 2025-11-25
**Phiên bản:** 1.0
**Trạng thái:** Đang chờ xác nhận

---

## TỔNG QUAN

Tài liệu này mô tả chi tiết kế hoạch triển khai 4 tính năng mới cho hệ thống Quỹ Chung:

1. **Currency Input Formatting** - Format nhập liệu số tiền với dấu phẩy phân cách
2. **Mobile UI Optimization** - Tối ưu giao diện mobile cho danh sách thành viên
3. **Treasurer Account Info** - Hiển thị thông tin tài khoản thủ quỹ khi nhập thu
4. **Role-based Permissions & Transaction Workflow** - Phân quyền và workflow xác nhận giao dịch

---

## FEATURE 1: CURRENCY INPUT FORMATTING

### 📋 Mô tả tính năng
Khi người dùng nhập số tiền, hệ thống tự động format với dấu phẩy (`,`) phân cách hàng nghìn để dễ đọc.

**Ví dụ:**
- Nhập: `1000000` → Hiển thị: `1,000,000`
- Nhập: `50000` → Hiển thị: `50,000`

### 🎯 Mục tiêu
- Cải thiện UX khi nhập số tiền lớn
- Giảm sai sót do nhìn nhầm số chữ số
- Đồng nhất với format hiển thị hiện tại (đã có `formatCurrency`)

### 📊 Phân tích hiện trạng

**Files liên quan:**
- `frontend/src/components/TransactionForm.js` - Form nhập giao dịch
- `frontend/src/utils/formatters.js` - Các hàm format đã có

**Vấn đề hiện tại:**
- Input type="number" không hỗ trợ format với dấu phẩy
- Người dùng phải đếm số 0 khi nhập số tiền lớn

### 🔧 Thiết kế giải pháp

#### A. Frontend Changes

**File: `frontend/src/components/TransactionForm.js`**

**Thay đổi:**
1. Đổi input từ `type="number"` sang `type="text"`
2. Thêm state để lưu giá trị đã format và giá trị thực
3. Thêm hàm `formatInputCurrency()` để format real-time
4. Thêm hàm `parseInputCurrency()` để parse về số khi submit

**Pseudo code:**
```javascript
// State
const [formattedAmount, setFormattedAmount] = useState('');
const [actualAmount, setActualAmount] = useState(0);

// Format khi người dùng nhập
const handleAmountChange = (e) => {
  const input = e.target.value;

  // Chỉ cho phép số và dấu phẩy
  const cleaned = input.replace(/[^0-9]/g, '');

  // Parse to number
  const number = parseFloat(cleaned) || 0;

  // Format with comma separator
  const formatted = number.toLocaleString('vi-VN');

  setFormattedAmount(formatted);
  setActualAmount(number);
};

// Submit với giá trị thực
const handleSubmit = () => {
  onSubmit({
    type,
    amount_token: actualAmount,
    note: formData.note,
  });
};
```

#### B. Utility Functions

**File: `frontend/src/utils/formatters.js`**

**Thêm mới:**
```javascript
/**
 * Parse currency input string to number
 * @param {string} value - Formatted currency string (e.g., "1,000,000")
 * @returns {number} Parsed number
 */
export const parseCurrencyInput = (value) => {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, '')) || 0;
};

/**
 * Format number for currency input field
 * @param {string|number} value - Value to format
 * @returns {string} Formatted string with comma separators
 */
export const formatCurrencyInput = (value) => {
  if (!value) return '';
  const cleaned = String(value).replace(/[^0-9]/g, '');
  const number = parseFloat(cleaned) || 0;
  return number.toLocaleString('vi-VN');
};
```

### 📝 Implementation Tasks

**Task 1.1: Update formatters utility**
- File: `frontend/src/utils/formatters.js`
- Add: `parseCurrencyInput()` function
- Add: `formatCurrencyInput()` function
- Test: Unit tests for edge cases

**Task 1.2: Update TransactionForm component**
- File: `frontend/src/components/TransactionForm.js`
- Change: Input type from "number" to "text"
- Add: State for formatted and actual amount
- Add: onChange handler with formatting logic
- Update: Form submission to use actual amount
- Add: Input validation (only numbers and commas)

**Task 1.3: Update CSS styling**
- File: `frontend/src/styles/TransactionForm.css`
- Ensure: Text input styling matches number input
- Add: Right-align text for better UX

### ✅ Test Cases

**TC1.1: Basic formatting**
- Input: "1000000"
- Expected display: "1,000,000"
- Expected submit value: 1000000

**TC1.2: Incremental typing**
- Type: "1" → Display: "1"
- Type: "10" → Display: "10"
- Type: "100" → Display: "100"
- Type: "1000" → Display: "1,000"
- Type: "10000" → Display: "10,000"

**TC1.3: Copy-paste with commas**
- Input: "1,000,000"
- Expected display: "1,000,000"
- Expected submit value: 1000000

**TC1.4: Invalid input handling**
- Input: "abc123"
- Expected display: "123"
- Input: "12.34.56"
- Expected display: "123,456"

**TC1.5: Empty and zero values**
- Input: "" → Display: "", Submit: 0
- Input: "0" → Display: "0", Submit: 0

### 📋 Test Plan

**Manual Testing:**
1. ✅ Nhập số tiền nhỏ (< 1,000)
2. ✅ Nhập số tiền trung bình (10,000 - 100,000)
3. ✅ Nhập số tiền lớn (> 1,000,000)
4. ✅ Copy/paste số tiền có dấu phẩy
5. ✅ Copy/paste số tiền không có dấu phẩy
6. ✅ Nhập ký tự không hợp lệ
7. ✅ Submit form và kiểm tra API call
8. ✅ Kiểm tra trên mobile

**Browser Testing:**
- Chrome Desktop ✅
- Chrome Mobile ✅
- Safari iOS ✅
- Firefox ✅

---

## FEATURE 2: MOBILE UI OPTIMIZATION

### 📋 Mô tả tính năng
Tối ưu giao diện mobile cho phần danh sách thành viên:
- Hiển thị số lượng thành viên thay vì list đầy đủ
- Thu gọn danh sách vào menu/modal
- Đưa phần giao dịch lên trên (ưu tiên hơn)

### 🎯 Mục tiêu
- Tối ưu không gian màn hình trên mobile
- Ưu tiên hiển thị thông tin quan trọng (giao dịch)
- Cải thiện trải nghiệm cuộn trang

### 📊 Phân tích hiện trạng

**Files liên quan:**
- `frontend/src/pages/TreasuryDetail.js` - Trang chi tiết quỹ
- `frontend/src/styles/TreasuryDetail.css` - Styling

**Vấn đề hiện tại:**
- Danh sách thành viên chiếm nhiều không gian
- Phải cuộn xuống mới thấy được giao dịch
- Trên mobile với nhiều thành viên (>10), UI bị dài

### 🔧 Thiết kế giải pháp

#### A. Layout Restructuring

**Thứ tự mới trên mobile:**
1. Balance Card (giữ nguyên)
2. Action Buttons (giữ nguyên)
3. **Transactions Section** ← Đưa lên trước
4. **Members Summary** ← Thu gọn

#### B. Members Section UI

**Desktop (>768px):** Giữ nguyên như hiện tại
**Mobile (<768px):**

```
┌─────────────────────────────┐
│ Thành viên (12) [⌄]         │ ← Clickable header
└─────────────────────────────┘
```

Khi click → Mở modal/expandable section:
```
┌─────────────────────────────┐
│ Thành viên (12) [⌃]         │
├─────────────────────────────┤
│ • Nguyễn Văn A    Admin     │
│ • Trần Thị B      Treasurer │
│ • Lê Văn C        Member    │
│ ...                         │
└─────────────────────────────┘
```

#### C. Component Structure

**New Component: `MembersSummary.js`**
```javascript
const MembersSummary = ({ members, onAddMember, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Desktop: Always expanded
  // Mobile: Collapsed by default

  return (
    <div className="members-section">
      <div
        className="section-header clickable"
        onClick={() => isMobile && setExpanded(!expanded)}
      >
        <h3>
          Thành viên ({members.length})
          {isMobile && <span className={`arrow ${expanded ? 'up' : 'down'}`}>▼</span>}
        </h3>
        {isAdmin && (
          <button onClick={onAddMember}>+ Thêm</button>
        )}
      </div>

      {(!isMobile || expanded) && (
        <div className="members-list">
          {members.map(...)}
        </div>
      )}
    </div>
  );
};
```

### 📝 Implementation Tasks

**Task 2.1: Create MembersSummary component**
- File: `frontend/src/components/MembersSummary.js` (NEW)
- Implement: Expandable/collapsible logic
- Add: Mobile detection
- Add: Responsive behavior

**Task 2.2: Update TreasuryDetail layout**
- File: `frontend/src/pages/TreasuryDetail.js`
- Reorder: Move Transactions before Members
- Replace: Members section with MembersSummary component
- Update: Responsive layout

**Task 2.3: Update CSS for mobile**
- File: `frontend/src/styles/TreasuryDetail.css`
- Add: Mobile media queries (@media max-width: 768px)
- Add: Expandable section animations
- Add: Arrow icon styling

**Task 2.4: Create component styling**
- File: `frontend/src/styles/MembersSummary.css` (NEW)
- Add: Collapsed state styling
- Add: Expanded state styling
- Add: Transition animations

### ✅ Test Cases

**TC2.1: Desktop behavior**
- Screen width > 768px
- Members list: Always visible
- No expand/collapse functionality

**TC2.2: Mobile collapsed state**
- Screen width < 768px
- Initial state: Collapsed
- Display: "Thành viên (X)" with down arrow
- Members list: Hidden

**TC2.3: Mobile expand/collapse**
- Click header → List expands
- Click header again → List collapses
- Animation: Smooth transition

**TC2.4: Layout order on mobile**
- Balance Card (top)
- Action Buttons
- Transactions Section
- Members Summary (bottom)

**TC2.5: Responsive resize**
- Resize from desktop → mobile: Auto-collapse
- Resize from mobile → desktop: Auto-expand

### 📋 Test Plan

**Mobile Testing:**
1. ✅ iPhone SE (small screen)
2. ✅ iPhone 12/13 (medium screen)
3. ✅ iPhone 12 Pro Max (large screen)
4. ✅ Android (various sizes)
5. ✅ iPad (tablet)
6. ✅ Landscape orientation

**Functional Testing:**
1. ✅ Click to expand/collapse
2. ✅ Add member button still works
3. ✅ Member list renders correctly
4. ✅ Scroll behavior smooth
5. ✅ Animation performance

---

## FEATURE 3: TREASURER ACCOUNT INFO DISPLAY

### 📋 Mô tả tính năng
Khi người dùng nhấn "Nhập thu", hiển thị thông tin tài khoản ngân hàng của thủ quỹ:
- Số tài khoản
- Tên tài khoản
- Ngân hàng
- Mã QR Code

Admin có quyền cấu hình thông tin này cho từng quỹ.

### 🎯 Mục tiêu
- Thuận tiện cho thành viên khi chuyển tiền
- Tự động hóa việc cung cấp thông tin TK
- Quản lý tập trung thông tin ngân hàng
- Tích hợp QR Code để thanh toán nhanh

### 📊 Phân tích hiện trạng

**Files liên quan:**
- `backend/internal/models/models.go` - Data models
- `frontend/src/pages/TreasuryDetail.js` - Transaction form
- `frontend/src/components/TransactionForm.js` - Form component

**Vấn đề hiện tại:**
- Không có nơi lưu thông tin tài khoản ngân hàng
- Thành viên phải hỏi thủ quỹ khi muốn chuyển tiền
- Không có tích hợp QR Code

### 🔧 Thiết kế giải pháp

#### A. Database Schema Changes

**New Model: `TreasuryBankAccount`**

```go
// TreasuryBankAccount represents bank account info for a treasury
type TreasuryBankAccount struct {
    ID              uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
    TreasuryID      uuid.UUID `gorm:"type:uuid;not null;unique" json:"treasury_id"`
    BankName        string    `gorm:"type:varchar(255);not null" json:"bank_name"`
    AccountNumber   string    `gorm:"type:varchar(50);not null" json:"account_number"`
    AccountName     string    `gorm:"type:varchar(255);not null" json:"account_name"`
    QRCodeURL       string    `gorm:"type:text" json:"qr_code_url,omitempty"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`

    // Relations
    Treasury Treasury `gorm:"foreignKey:TreasuryID" json:"treasury,omitempty"`
}
```

**Migration:**
```sql
CREATE TABLE treasury_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treasury_id UUID NOT NULL UNIQUE REFERENCES treasuries(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Backend API Endpoints

**New Endpoints:**

```go
// GET /api/treasuries/:id/bank-account
// Get bank account info for a treasury
// Response: TreasuryBankAccount

// PUT /api/treasuries/:id/bank-account
// Update bank account info (Admin only)
// Request: {
//   bank_name: string,
//   account_number: string,
//   account_name: string,
//   qr_code_url?: string
// }
// Response: TreasuryBankAccount

// DELETE /api/treasuries/:id/bank-account
// Delete bank account info (Admin only)
```

**QR Code Generation:**
Sử dụng format VietQR (chuẩn của Ngân hàng Nhà nước):
```
https://api.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-{TEMPLATE}.jpg?amount={AMOUNT}&addInfo={NOTE}
```

#### C. Frontend Components

**New Component: `BankAccountInfo.js`**

```javascript
const BankAccountInfo = ({ bankAccount, amount }) => {
  // Generate QR Code URL với số tiền
  const qrUrl = bankAccount?.qr_code_url
    ? `${bankAccount.qr_code_url}?amount=${amount}`
    : null;

  return (
    <div className="bank-account-info">
      <h3>Thông tin chuyển khoản</h3>

      <div className="account-details">
        <div className="detail-row">
          <span className="label">Ngân hàng:</span>
          <span className="value">{bankAccount.bank_name}</span>
        </div>
        <div className="detail-row">
          <span className="label">Số tài khoản:</span>
          <span className="value copyable">
            {bankAccount.account_number}
            <button onClick={() => copyToClipboard(bankAccount.account_number)}>
              📋
            </button>
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Tên tài khoản:</span>
          <span className="value">{bankAccount.account_name}</span>
        </div>
      </div>

      {qrUrl && (
        <div className="qr-code">
          <img src={qrUrl} alt="QR Code" />
          <p className="qr-note">Quét mã QR để chuyển khoản</p>
        </div>
      )}

      <div className="transfer-note">
        <p>💡 Nội dung chuyển khoản: <strong>Nạp quỹ [Tên của bạn]</strong></p>
      </div>
    </div>
  );
};
```

**Update: `TransactionForm.js`**

```javascript
const TransactionForm = ({ type, onSubmit, onCancel, bankAccount }) => {
  // ...existing code...

  return (
    <form onSubmit={handleSubmit}>
      {type === 'INCOME' && bankAccount && (
        <BankAccountInfo
          bankAccount={bankAccount}
          amount={formData.amount_token}
        />
      )}

      {/* Existing form fields */}
    </form>
  );
};
```

**New Component: `BankAccountSettings.js`** (Admin only)

```javascript
const BankAccountSettings = ({ treasuryId, bankAccount, onUpdate }) => {
  const [formData, setFormData] = useState({
    bank_name: bankAccount?.bank_name || '',
    account_number: bankAccount?.account_number || '',
    account_name: bankAccount?.account_name || '',
    qr_code_url: bankAccount?.qr_code_url || '',
  });

  // Form to update bank account
  // Only visible to Admin
};
```

### 📝 Implementation Tasks

**Task 3.1: Database migration**
- File: `backend/internal/database/migrations/` (NEW)
- Create: Migration for treasury_bank_accounts table
- Add: Migration runner in database.go

**Task 3.2: Backend models**
- File: `backend/internal/models/models.go`
- Add: TreasuryBankAccount struct
- Add: Request/Response DTOs

**Task 3.3: Backend API handlers**
- File: `backend/internal/api/treasury_handler.go`
- Add: GetBankAccount() handler
- Add: UpdateBankAccount() handler (admin only)
- Add: DeleteBankAccount() handler (admin only)

**Task 3.4: Backend routes**
- File: `backend/cmd/main.go`
- Add: GET /api/treasuries/:id/bank-account
- Add: PUT /api/treasuries/:id/bank-account
- Add: DELETE /api/treasuries/:id/bank-account

**Task 3.5: Frontend API client**
- File: `frontend/src/services/api.js`
- Add: getBankAccount() method
- Add: updateBankAccount() method

**Task 3.6: BankAccountInfo component**
- File: `frontend/src/components/BankAccountInfo.js` (NEW)
- Implement: Display logic
- Add: Copy to clipboard functionality
- Add: QR Code display

**Task 3.7: Update TransactionForm**
- File: `frontend/src/components/TransactionForm.js`
- Add: bankAccount prop
- Add: Conditional rendering for INCOME type
- Integrate: BankAccountInfo component

**Task 3.8: BankAccountSettings component**
- File: `frontend/src/components/BankAccountSettings.js` (NEW)
- Implement: Admin-only form
- Add: Validation
- Add: Save/Cancel actions

**Task 3.9: Update TreasuryDetail**
- File: `frontend/src/pages/TreasuryDetail.js`
- Fetch: Bank account data
- Pass: Bank account to TransactionForm
- Add: Settings button for admin

### ✅ Test Cases

**TC3.1: Display bank account info (Member)**
- User type: Member
- Action: Click "Nhập thu"
- Expected: Modal shows bank account info
- Display: Bank name, account number, account name, QR code

**TC3.2: Copy account number**
- Action: Click copy button
- Expected: Account number copied to clipboard
- Show: Success notification

**TC3.3: QR Code with amount**
- Enter amount: 100,000
- Expected: QR URL includes ?amount=100000
- QR code: Scannable and prefills amount

**TC3.4: No bank account configured**
- Treasury: No bank account set
- Action: Click "Nhập thu"
- Expected: Show form without bank info
- Display: Warning message "Chưa cấu hình thông tin ngân hàng"

**TC3.5: Update bank account (Admin)**
- User type: Admin
- Action: Update bank account settings
- Expected: Success save
- Verify: New info displays correctly

**TC3.6: Update bank account (Non-admin)**
- User type: Member
- Expected: Settings button not visible
- API call: Returns 403 Forbidden

### 📋 Test Plan

**Functional Testing:**
1. ✅ Admin sets up bank account
2. ✅ Member views bank info when creating INCOME transaction
3. ✅ Copy to clipboard works
4. ✅ QR Code generates correctly
5. ✅ QR Code includes transaction amount
6. ✅ Member cannot access settings
7. ✅ Admin can update bank info
8. ✅ Admin can delete bank info

**Integration Testing:**
1. ✅ Bank account persists in database
2. ✅ Multiple treasuries have different bank accounts
3. ✅ Deleting treasury cascades to bank account

---

## FEATURE 4: ROLE-BASED PERMISSIONS & TRANSACTION WORKFLOW

### 📋 Mô tả tính năng
Hệ thống phân quyền 3 cấp:
1. **Admin** - Người tạo quỹ, toàn quyền
2. **Treasurer** (Thủ quỹ) - Xác nhận giao dịch, quản lý tiền
3. **Member** (Thành viên) - Chỉ nhập giao dịch

**Transaction Workflow:**
1. Member tạo giao dịch → Trạng thái: `PENDING`
2. Member chuyển tiền vào TK thủ quỹ
3. Treasurer nhận tiền → Xác nhận/chỉnh sửa số tiền → Trạng thái: `CONFIRMED`
4. Hệ thống ghi vào blockchain
5. Blockchain success → Trạng thái: `COMPLETED`

### 🎯 Mục tiêu
- Kiểm soát luồng tiền chặt chẽ
- Xác minh giao dịch trước khi ghi blockchain
- Phân quyền rõ ràng
- Audit trail đầy đủ

### 📊 Phân tích hiện trạng

**Files liên quan:**
- `backend/internal/models/models.go` - Models
- `backend/internal/api/transaction_handler.go` - Transaction logic
- `backend/internal/middleware/auth.go` - Authorization

**Vấn đề hiện tại:**
- Chỉ có 1 role: "member"
- Giao dịch ghi blockchain ngay lập tức
- Không có workflow xác nhận
- Không có kiểm soát ai được xác nhận

### 🔧 Thiết kế giải pháp

#### A. Role System

**Existing:**
```go
type Member struct {
    Role string `gorm:"type:varchar(50);default:'member'"`
}
```

**Updated Roles:**
```go
const (
    RoleAdmin     = "admin"     // Creator, full permissions
    RoleTreasurer = "treasurer" // Can confirm transactions
    RoleMember    = "member"    // Can create transactions
)
```

**Permissions Matrix:**

| Action | Admin | Treasurer | Member |
|--------|-------|-----------|--------|
| Create Treasury | ✅ | ✅ | ✅ |
| Add/Remove Members | ✅ | ❌ | ❌ |
| Assign Treasurer Role | ✅ | ❌ | ❌ |
| Update Bank Account | ✅ | ❌ | ❌ |
| Create Transaction | ✅ | ✅ | ✅ |
| **Confirm Transaction** | ✅ | ✅ | ❌ |
| **Edit Confirmed Amount** | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ |

#### B. Transaction States

**New Field:**
```go
type Transaction struct {
    // ...existing fields...
    Status          string    `gorm:"type:varchar(20);default:'pending'" json:"status"`
    ConfirmedAmount float64   `gorm:"type:decimal(20,8)" json:"confirmed_amount,omitempty"`
    ConfirmedBy     uuid.UUID `gorm:"type:uuid" json:"confirmed_by,omitempty"`
    ConfirmedAt     *time.Time `json:"confirmed_at,omitempty"`

    // Relations
    Confirmer *User `gorm:"foreignKey:ConfirmedBy" json:"confirmer,omitempty"`
}
```

**Status Flow:**
```
PENDING → CONFIRMED → COMPLETED
   ↓
REJECTED → (Member edit) → PENDING (again)
   ↓
DELETED (soft delete)
```

**Status Descriptions:**
- `PENDING` - Thành viên vừa tạo, chưa chuyển tiền hoặc chưa được xác nhận
- `CONFIRMED` - Thủ quỹ đã xác nhận nhận được tiền, đang ghi blockchain
- `COMPLETED` - Đã ghi thành công lên blockchain
- `REJECTED` - Thủ quỹ từ chối (số tiền sai, không nhận được, etc.) - **Member có thể chỉnh sửa và gửi lại**
- `DELETED` - Giao dịch đã bị xóa (soft delete) - **Ẩn khỏi danh sách mặc định**

#### C. Database Migration

```sql
-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN confirmed_amount DECIMAL(20,8),
ADD COLUMN confirmed_by UUID REFERENCES users(id),
ADD COLUMN confirmed_at TIMESTAMP;

-- Add index for faster queries
CREATE INDEX idx_transactions_status ON transactions(status);

-- Update existing transactions to COMPLETED
UPDATE transactions SET status = 'completed' WHERE status IS NULL;
```

#### D. Backend API Changes

**New Endpoints:**

```go
// POST /api/treasuries/:id/transactions/:txId/confirm
// Confirm a transaction (Treasurer/Admin only)
type ConfirmTransactionRequest struct {
    ConfirmedAmount float64 `json:"confirmed_amount" binding:"required,gt=0"`
    Note            string  `json:"note"` // Additional note from treasurer
}

// POST /api/treasuries/:id/transactions/:txId/reject
// Reject a transaction (Treasurer/Admin only)
type RejectTransactionRequest struct {
    Reason string `json:"reason" binding:"required"`
}

// PUT /api/treasuries/:id/transactions/:txId/edit
// Edit rejected transaction (Member who created it only)
type EditTransactionRequest struct {
    AmountToken float64 `json:"amount_token" binding:"required,gt=0"`
    Note        string  `json:"note"`
}
// This changes status from REJECTED → PENDING

// DELETE /api/treasuries/:id/transactions/:txId
// Soft delete transaction (Creator or Admin only)
// Sets status to DELETED

// GET /api/treasuries/:id/transactions?status=pending,completed
// Filter transactions by status (comma-separated)
// Default: excludes DELETED status
// Use status=all to see DELETED transactions
```

**Updated Logic:**

```go
// CreateTransaction - Old
func CreateTransaction() {
    // 1. Save to database
    // 2. Write to blockchain immediately ❌
}

// CreateTransaction - New
func CreateTransaction() {
    // 1. Save to database with status=PENDING
    // 2. Return transaction (DO NOT write to blockchain yet)
}

// ConfirmTransaction - New
func ConfirmTransaction() {
    // 1. Check user is Treasurer or Admin
    // 2. Update status to CONFIRMED
    // 3. Update confirmed_amount
    // 4. NOW write to blockchain
    // 5. If blockchain success → status = COMPLETED
}
```

#### E. Middleware Updates

**New Middleware: `RequireRole`**

```go
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetString("user_id")
        treasuryID := c.Param("id")

        // Get user's role in this treasury
        var member Member
        err := db.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).
            First(&member).Error

        if err != nil {
            c.JSON(403, gin.H{"error": "Not a member"})
            c.Abort()
            return
        }

        // Check if user's role is allowed
        allowed := false
        for _, role := range allowedRoles {
            if member.Role == role {
                allowed = true
                break
            }
        }

        if !allowed {
            c.JSON(403, gin.H{"error": "Permission denied"})
            c.Abort()
            return
        }

        c.Set("member_role", member.Role)
        c.Next()
    }
}
```

**Usage:**
```go
// Only Treasurer or Admin can confirm
protected.POST("/treasuries/:id/transactions/:txId/confirm",
    RequireRole(RoleAdmin, RoleTreasurer),
    transactionHandler.ConfirmTransaction)
```

#### F. Frontend Changes

**New Components:**

**1. `TransactionStatusBadge.js`**
```javascript
const TransactionStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Chờ xác nhận', color: 'orange' },
    confirmed: { label: 'Đang xử lý', color: 'blue' },
    completed: { label: 'Hoàn thành', color: 'green' },
    rejected: { label: 'Đã từ chối', color: 'red' },
    deleted: { label: 'Đã xóa', color: 'gray' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`status-badge status-${config.color}`}>
      {config.label}
    </span>
  );
};
```

**2. `PendingTransactions.js`** (Treasurer view)
```javascript
const PendingTransactions = ({ treasuryId }) => {
  const [pendingTxs, setPendingTxs] = useState([]);

  const handleConfirm = async (txId, confirmedAmount) => {
    await transactionAPI.confirm(treasuryId, txId, { confirmed_amount: confirmedAmount });
    // Reload
  };

  const handleReject = async (txId, reason) => {
    await transactionAPI.reject(treasuryId, txId, { reason });
    // Reload
  };

  return (
    <div className="pending-transactions">
      <h3>Giao dịch chờ xác nhận ({pendingTxs.length})</h3>
      {pendingTxs.map(tx => (
        <PendingTransactionCard
          key={tx.id}
          transaction={tx}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      ))}
    </div>
  );
};
```

**3. `RejectedTransactionCard.js`** (Member view for rejected transactions)
```javascript
const RejectedTransactionCard = ({ transaction, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(transaction.amount_token);
  const [note, setNote] = useState(transaction.note);

  const handleSaveEdit = async () => {
    await onEdit(transaction.id, { amount_token: amount, note });
    setIsEditing(false);
  };

  return (
    <div className="rejected-transaction-card">
      <TransactionStatusBadge status="rejected" />
      <p className="reject-reason">Lý do: {transaction.reject_reason}</p>

      {isEditing ? (
        <div className="edit-form">
          <input type="text" value={amount} onChange={e => setAmount(e.target.value)} />
          <textarea value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={handleSaveEdit}>Gửi lại</button>
          <button onClick={() => setIsEditing(false)}>Hủy</button>
        </div>
      ) : (
        <div className="actions">
          <button onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
          <button onClick={() => onDelete(transaction.id)}>Xóa</button>
        </div>
      )}
    </div>
  );
};
```

**4. `TransactionStatusFilter.js`** (Filter component)
```javascript
const TransactionStatusFilter = ({ currentStatus, onChange }) => {
  const statusOptions = [
    { value: '', label: 'Tất cả (trừ đã xóa)' },
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đang xử lý' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'rejected', label: 'Đã từ chối' },
    { value: 'all', label: 'Tất cả (kể cả đã xóa)' },
  ];

  return (
    <select value={currentStatus} onChange={e => onChange(e.target.value)}>
      {statusOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};
```

**5. Update `TransactionList.js`**
- Add status badge for each transaction
- Show different UI based on status
- Allow treasurer to confirm from list
- Add status filter dropdown
- Show edit/delete buttons for rejected transactions (creator only)

**6. Update `TreasuryDetail.js`**
- Add "Pending Transactions" section for Treasurer/Admin
- Add "Rejected Transactions" section for Member (own rejected transactions)
- Add status filter in transactions section
- Show notification badge for pending count
- Default filter: Exclude DELETED status

#### G. Blockchain Integration Update

**File: `backend/internal/services/blockchain_service.go`**

```go
// Old: Write to blockchain immediately
func (s *BlockchainService) LogTransaction(tx *models.Transaction) error {
    // Write immediately ❌
}

// New: Only write confirmed transactions
func (s *BlockchainService) LogConfirmedTransaction(tx *models.Transaction) error {
    // 1. Check transaction status is CONFIRMED
    if tx.Status != "confirmed" {
        return errors.New("transaction must be confirmed first")
    }

    // 2. Use confirmed_amount instead of amount_token
    amount := tx.ConfirmedAmount
    if amount == 0 {
        amount = tx.AmountToken // Fallback
    }

    // 3. Write to blockchain
    txHash, err := s.writeToChain(tx.TreasuryID, amount, tx.Type == "INCOME")

    // 4. Update transaction status to COMPLETED
    if err == nil {
        tx.Status = "completed"
        db.Save(tx)
    }

    return err
}
```

### 📝 Implementation Tasks

**Task 4.1: Database migration**
- File: `backend/internal/database/migrations/` (NEW)
- Create: Migration for transaction status fields
- Update: Existing transactions to "completed"

**Task 4.2: Update models**
- File: `backend/internal/models/models.go`
- Add: Status, ConfirmedAmount, ConfirmedBy, ConfirmedAt fields
- Add: Role constants (RoleAdmin, RoleTreasurer, RoleMember)
- Add: ConfirmTransactionRequest DTO
- Add: RejectTransactionRequest DTO

**Task 4.3: Create role middleware**
- File: `backend/internal/middleware/role.go` (NEW)
- Implement: RequireRole() middleware
- Add: Helper functions for role checking

**Task 4.4: Update transaction handler**
- File: `backend/internal/api/transaction_handler.go`
- Update: CreateTransaction() - set status=PENDING, don't write blockchain
- Add: ConfirmTransaction() handler
- Add: RejectTransaction() handler
- Update: GetTransactions() - support status filter

**Task 4.5: Update blockchain service**
- File: `backend/internal/services/blockchain_service.go`
- Update: Only write CONFIRMED transactions
- Use: confirmed_amount instead of amount_token
- Handle: Status update after blockchain write

**Task 4.6: Add API routes**
- File: `backend/cmd/main.go`
- Add: POST /api/treasuries/:id/transactions/:txId/confirm
- Add: POST /api/treasuries/:id/transactions/:txId/reject
- Add: Middleware RequireRole for new endpoints

**Task 4.7: Update frontend API client**
- File: `frontend/src/services/api.js`
- Add: confirmTransaction() method
- Add: rejectTransaction() method
- Update: getTransactions() - support status filter

**Task 4.8: Create status badge component**
- File: `frontend/src/components/TransactionStatusBadge.js` (NEW)
- Implement: Status display logic
- Add: Styling for each status

**Task 4.9: Create pending transactions component**
- File: `frontend/src/components/PendingTransactions.js` (NEW)
- Implement: List of pending transactions
- Add: Confirm/Reject actions
- Add: Edit confirmed amount feature

**Task 4.10: Update TransactionList**
- File: `frontend/src/components/TransactionList.js`
- Add: Status badge for each transaction
- Add: Conditional rendering based on status
- Add: Different styling for pending/confirmed/completed

**Task 4.11: Update TreasuryDetail**
- File: `frontend/src/pages/TreasuryDetail.js`
- Add: Fetch user's role
- Add: Conditional rendering for Treasurer features
- Add: PendingTransactions section (Treasurer/Admin only)
- Add: Pending count notification

**Task 4.12: Update member management**
- File: `frontend/src/components/MemberManagement.js` or similar
- Add: Role selection dropdown (Admin only)
- Add: Assign/Change role functionality
- Display: Role badges for each member

### ✅ Test Cases

**TC4.1: Member creates transaction**
- User role: Member
- Action: Create INCOME transaction
- Expected: Status = PENDING
- Blockchain: NOT written yet

**TC4.2: Treasurer confirms transaction**
- User role: Treasurer
- Action: Confirm pending transaction
- Input: confirmed_amount = 100,000
- Expected: Status = CONFIRMED → COMPLETED
- Blockchain: Written with confirmed amount

**TC4.3: Treasurer edits amount**
- Scenario: Member said 100k, but only transferred 95k
- Action: Treasurer confirms with 95,000
- Expected: Transaction saved with confirmed_amount = 95,000
- Blockchain: Records 95,000 (not 100,000)

**TC4.4: Member cannot confirm**
- User role: Member
- Action: Try to confirm transaction
- Expected: 403 Forbidden
- UI: Confirm button not visible

**TC4.5: Treasurer rejects transaction**
- User role: Treasurer
- Action: Reject with reason "Số tiền không đúng"
- Expected: Status = REJECTED
- Blockchain: NOT written
- Notification: Sent to creator

**TC4.6: Admin assigns treasurer role**
- User role: Admin
- Action: Change member role to "treasurer"
- Expected: Member now sees pending transactions
- Permission: Can confirm transactions

**TC4.7: Filter transactions by status**
- Action: Filter by PENDING
- Expected: Only pending transactions shown
- Action: Filter by COMPLETED
- Expected: Only completed transactions shown

**TC4.8: Transaction status flow**
- Step 1: Member creates → Status: PENDING
- Step 2: Treasurer confirms → Status: CONFIRMED
- Step 3: Blockchain write success → Status: COMPLETED
- Each step: UI updates correctly

**TC4.9: Concurrent confirmation prevention**
- Scenario: 2 treasurers try to confirm same transaction
- Expected: Only first confirmation succeeds
- Second: Gets error "Already confirmed"

**TC4.10: Pending notification badge**
- Treasurer view: Badge shows count of pending transactions
- Click: Opens pending transactions section
- Badge: Updates in real-time

### 📋 Test Plan

**Role Permission Testing:**
1. ✅ Admin can do everything
2. ✅ Treasurer can confirm/reject
3. ✅ Member can only create
4. ✅ Non-member cannot access

**Workflow Testing:**
1. ✅ Create transaction → PENDING
2. ✅ Confirm → CONFIRMED → COMPLETED
3. ✅ Reject → REJECTED
4. ✅ Edit amount during confirmation
5. ✅ Blockchain written only for CONFIRMED
6. ✅ Status updates correctly

**UI/UX Testing:**
1. ✅ Status badges display correctly
2. ✅ Pending section only for Treasurer/Admin
3. ✅ Confirm button disabled for non-treasurer
4. ✅ Notification badge updates
5. ✅ Filter by status works

**Integration Testing:**
1. ✅ Database transactions are atomic
2. ✅ Blockchain write failures handled
3. ✅ Role changes propagate immediately
4. ✅ Multiple treasuries don't interfere

---

## IMPLEMENTATION ORDER

### Phase 1: Low-risk Quick Wins
**Priority: HIGH | Complexity: LOW**

1. **Feature 1: Currency Formatting** (1-2 days)
   - Purely frontend
   - No database changes
   - Low risk
   - Immediate UX improvement

2. **Feature 2: Mobile UI Optimization** (2-3 days)
   - Purely frontend
   - No API changes
   - Enhances mobile experience

**Total: 3-5 days**

### Phase 2: Configuration Features
**Priority: MEDIUM | Complexity: MEDIUM**

3. **Feature 3: Treasurer Account Info** (3-4 days)
   - Database migration
   - Backend API
   - Frontend integration
   - Independent from Feature 4

**Total: 3-4 days**

### Phase 3: Complex Workflow Changes
**Priority: HIGH | Complexity: HIGH**

4. **Feature 4: Role-based Permissions** (5-7 days)
   - Database migration
   - Backend API changes
   - Middleware updates
   - Blockchain service refactor
   - Frontend components
   - Extensive testing required

**Total: 5-7 days**

---

## CONFIRMATION CHECKLIST

Trước khi bắt đầu implementation, xin xác nhận:

### Feature 1: Currency Formatting
- ✅ Format với dấu phẩy (`,`) phân cách hàng nghìn
- ✅ Input type text thay vì number
- ✅ Copy/paste số có dấu phẩy vẫn hoạt động

### Feature 2: Mobile UI
- ✅ Danh sách thành viên thu gọn trên mobile
- ✅ Giao dịch hiển thị ưu tiên (trên danh sách thành viên)
- ✅ Click để mở rộng/thu gọn danh sách
- ✅ Desktop giữ nguyên như cũ

### Feature 3: Bank Account Info
- ✅ Hiển thị khi nhấn "Nhập thu"
- ✅ Bao gồm: Số TK, Tên TK, Ngân hàng, QR Code
- ✅ QR Code động với số tiền
- ✅ Chỉ Admin cấu hình được
- ✅ Copy số TK với 1 click

### Feature 4: Permissions & Workflow
- ✅ 3 roles: Admin, Treasurer, Member
- ✅ Member tạo giao dịch → Status: PENDING
- ✅ Treasurer xác nhận → Ghi blockchain
- ✅ Treasurer có thể chỉnh sửa số tiền thực nhận
- ✅ Blockchain chỉ ghi sau khi CONFIRMED

---

## XIN XÁC NHẬN

Anh vui lòng xem xét:

1. **Thiết kế tổng thể**: Có đúng với yêu cầu không?
2. **Thứ tự triển khai**: Phase 1 → Phase 2 → Phase 3 có hợp lý không?
3. **Chi tiết kỹ thuật**: Database schema, API endpoints, components có cần điều chỉnh gì không?
4. **Test cases**: Có case nào cần bổ sung không?

Sau khi anh confirm, em sẽ bắt đầu implementation từng feature một và test kỹ trên local trước khi commit.
