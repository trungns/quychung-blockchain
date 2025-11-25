# Hệ thống Auto-Migration

## Tổng quan

Từ bây giờ, **database migrations sẽ tự động chạy** mỗi khi bạn deploy lên production qua Devtron. Bạn không cần phải vào container để chạy migration thủ công nữa.

## Cách hoạt động

### 1. Migration Files được Embed vào Go Binary

Tất cả SQL migration files trong folder `backend/internal/database/migrations/` được **nhúng (embed) vào Go binary** khi build:

```go
//go:embed migrations/*.sql
var migrationFiles embed.FS
```

Điều này có nghĩa:
- ✅ Migration files luôn đi kèm với binary
- ✅ Không cần mount volume hay copy files riêng
- ✅ Version của code và migrations luôn đồng bộ

### 2. Migration History Tracking

Hệ thống tạo table `migration_histories` để track migrations đã chạy:

```sql
CREATE TABLE migration_histories (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Auto-Run khi App Start

Khi app khởi động (`backend/cmd/main.go:41-44`):

```go
// Run migrations
if err := database.Migrate(); err != nil {
    log.Fatal("Failed to run migrations:", err)
}
```

Function `database.Migrate()` sẽ:
1. Tạo table `migration_histories` nếu chưa có
2. Đọc tất cả `.sql` files trong `migrations/` folder
3. Sắp xếp theo tên file (001_, 002_, 003_...)
4. Với mỗi migration file:
   - Kiểm tra xem đã chạy chưa (check `migration_histories`)
   - Nếu chưa → Chạy SQL và ghi vào `migration_histories`
   - Nếu rồi → Skip

## Workflow khi Deploy lên Production

### Trước đây (Manual):
```bash
# 1. Push code
git push origin main

# 2. Devtron build & deploy

# 3. Vào container chạy migration thủ công
docker exec -it app /bin/sh
psql -U quychung -d quychung -f migrations/003_add_treasury_bank_accounts.sql
```

### Bây giờ (Auto):
```bash
# 1. Tạo migration file mới
# backend/internal/database/migrations/004_add_new_feature.sql

# 2. Push code
git add .
git commit -m "feat: Add new feature with migration"
git push origin main

# 3. Devtron tự động:
#    - Build image (migrations được embed)
#    - Deploy
#    - App khởi động → Auto chạy migration
#    - DONE! ✅
```

## Cách tạo Migration mới

### 1. Đặt tên file theo quy ước

```
backend/internal/database/migrations/
├── 003_add_treasury_bank_accounts.sql    (đã có)
├── 004_add_transaction_status.sql         (mới)
└── 005_add_member_roles.sql               (mới)
```

**Quy tắc đặt tên:**
- Bắt đầu bằng số (001, 002, 003...)
- Tên mô tả rõ ràng
- Extension `.sql`
- Files sẽ được chạy theo thứ tự alphabet

### 2. Viết SQL an toàn

**❌ KHÔNG AN TOÀN:**
```sql
CREATE TABLE users (...);
CREATE INDEX idx_users_email ON users(email);
```

**✅ AN TOÀN (idempotent):**
```sql
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

**Lý do:** Migration có thể bị chạy lại nếu fail giữa chừng. Dùng `IF NOT EXISTS` để tránh lỗi.

### 3. Ví dụ Migration hoàn chỉnh

```sql
-- Migration: Add transaction status tracking
-- Purpose: Support pending/confirmed/rejected workflow
-- Date: 2025-11-25

-- Add new columns
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmed_amount DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS confirmed_by UUID,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_transactions_status
ON transactions(status);

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_transactions_confirmer'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_confirmer
        FOREIGN KEY (confirmed_by) REFERENCES users(id);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, confirmed, completed, rejected';
```

## Testing Migrations Locally

### Test migration hoạt động:

```bash
# 1. Xóa database cũ (CẢNH BÁO: Mất data)
docker-compose down
docker volume rm quychung_postgres-data

# 2. Start lại từ đầu
docker-compose up -d

# 3. Check logs
docker-compose logs app | grep migration

# Expected output:
# Running SQL migrations...
# Applying migration: 003_add_treasury_bank_accounts.sql
# Migration 003_add_treasury_bank_accounts.sql applied successfully
# SQL migrations completed
# Database migrations completed successfully
```

### Verify migration đã chạy:

```bash
# Check migration history
docker exec quychung-postgres psql -U quychung -d quychung -c "SELECT * FROM migration_histories;"

# Check table created
docker exec quychung-postgres psql -U quychung -d quychung -c "\d treasury_bank_accounts"
```

## Rollback Migrations

**⚠️ Migration runner này KHÔNG hỗ trợ rollback tự động.**

Nếu cần rollback:

### Option 1: Tạo migration mới để revert
```sql
-- 005_revert_transaction_status.sql
ALTER TABLE transactions
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS confirmed_amount;
```

### Option 2: Restore database backup
```bash
# Assuming you have daily backups
pg_restore -U quychung -d quychung backup_2025_11_24.dump
```

### Option 3: Manual fix
```bash
docker exec -it quychung-postgres psql -U quychung -d quychung
# Run SQL commands manually
```

## Best Practices

### ✅ DO

1. **Test locally trước khi push**
   ```bash
   docker-compose down && docker-compose up -d
   ```

2. **Viết migrations idempotent** (safe to run multiple times)
   - Dùng `IF NOT EXISTS`
   - Dùng `ALTER TABLE ADD COLUMN IF NOT EXISTS`
   - Check constraints trước khi thêm

3. **Một migration = một mục đích**
   - ❌ `004_add_multiple_features.sql`
   - ✅ `004_add_bank_accounts.sql`, `005_add_transaction_status.sql`

4. **Backup database trước khi deploy major changes**

5. **Document trong migration file**
   ```sql
   -- Migration: Purpose
   -- Jira: PROJ-123
   -- Date: 2025-11-25
   ```

### ❌ DON'T

1. **Không sửa migration đã deploy**
   - Nếu migration đã chạy trên production → Tạo migration mới để fix

2. **Không xóa migration files cũ**
   - Migration history dựa vào filename
   - Xóa file → tracking bị sai

3. **Không chạy DROP TABLE trực tiếp**
   - Rất nguy hiểm nếu migration fail giữa chừng
   - Nên có backup plan

4. **Không đặt migration phụ thuộc vào data có sẵn**
   ```sql
   -- ❌ BAD: Assumes data exists
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

   -- ✅ GOOD: Insert if not exists
   INSERT INTO users (email, role)
   VALUES ('admin@example.com', 'admin')
   ON CONFLICT (email) DO NOTHING;
   ```

## Troubleshooting

### Migration failed with error

**Check logs:**
```bash
docker-compose logs app | grep -i error
```

**Common errors:**

1. **"relation already exists"**
   - Cause: Missing `IF NOT EXISTS`
   - Fix: Update migration file, rebuild

2. **"syntax error"**
   - Cause: Invalid SQL
   - Fix: Test SQL in psql first

3. **"foreign key constraint violation"**
   - Cause: Referenced table doesn't exist
   - Fix: Reorder migrations or check dependencies

### Migration không chạy

1. **Check migration file có trong binary không:**
   ```bash
   docker exec app ls -la /root/
   # Migration files should be embedded in binary
   ```

2. **Check table `migration_histories`:**
   ```bash
   docker exec quychung-postgres psql -U quychung -d quychung -c "SELECT * FROM migration_histories;"
   ```

3. **Check migration_histories có record không:**
   - Nếu có → Migration đã chạy
   - Nếu không → App bị crash trước khi chạy migration

### Force re-run migration

```sql
-- CẢNH BÁO: Chỉ dùng trong development
DELETE FROM migration_histories WHERE filename = '003_add_treasury_bank_accounts.sql';
```

Sau đó restart app:
```bash
docker-compose restart app
```

## Summary

| Aspect | Manual Migration | Auto Migration (Hiện tại) |
|--------|------------------|--------------------------|
| **Deployment** | Push code → Deploy → SSH vào container → Chạy SQL | Push code → Deploy → DONE ✅ |
| **Tracking** | Không có | Table `migration_histories` |
| **Rollback** | Phải chạy SQL manually | Tạo migration mới |
| **Testing** | Khó test trên local | Dễ test với docker-compose |
| **Version Control** | SQL files riêng rẽ | Embed trong binary |

**Kết luận:** Với auto-migration, deployment process đơn giản hơn nhiều và ít lỗi hơn!
