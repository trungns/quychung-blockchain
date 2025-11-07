# Fix Lỗi "Error 401: invalid_client"

## Nguyên nhân

Lỗi này xảy ra khi Google OAuth configuration chưa đúng. Bạn cần thêm **Authorized JavaScript origins** và **Authorized redirect URIs**.

## Giải pháp - Cập nhật Google Cloud Console

### Bước 1: Vào Google Cloud Console

1. Truy cập: https://console.cloud.google.com/apis/credentials
2. Chọn project của bạn
3. Click vào OAuth 2.0 Client ID đã tạo (tên: "Quỹ Chung Web Client")

### Bước 2: Thêm Authorized JavaScript origins

Trong phần **Authorized JavaScript origins**, thêm:

```
http://localhost:3000
```

**Lưu ý**: Không có trailing slash `/`

### Bước 3: Thêm/Kiểm tra Authorized redirect URIs

Trong phần **Authorized redirect URIs**, đảm bảo có:

```
http://localhost:3000
http://localhost:3000/auth/callback
```

### Bước 4: Save

Click **Save** ở cuối trang.

### Bước 5: Đợi vài giây

Google cần vài giây để cập nhật config. Đợi khoảng 10-30 giây.

### Bước 6: Test lại

1. Mở http://localhost:3000
2. Hard refresh: `Cmd + Shift + R` (Mac) hoặc `Ctrl + Shift + R` (Windows)
3. Click "Sign in with Google"

## Hình ảnh tham khảo config

Sau khi config xong, bạn sẽ thấy:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000
http://localhost:3000/auth/callback  
```

## Nếu vẫn lỗi

### Option 1: Tạo lại OAuth Client

1. Delete OAuth Client ID hiện tại
2. Tạo mới:
   - Application type: **Web application**
   - Name: `Quỹ Chung Local`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: 
     - `http://localhost:3000`
     - `http://localhost:3000/auth/callback`

### Option 2: Kiểm tra Client Secret

Lỗi `invalid_client` đôi khi do Client Secret sai. Kiểm tra lại:

```bash
# Mở .env và so sánh với Google Console
cat .env | grep GOOGLE_CLIENT
```

### Option 3: Reset OAuth Consent Screen

1. Vào: APIs & Services → OAuth consent screen
2. Click "Edit App"
3. Đảm bảo **Publishing status** là "Testing"
4. Thêm email của bạn vào **Test users**

## Debug

### Kiểm tra Client ID đang dùng

```bash
curl http://localhost:3000/env-config.js
```

Kết quả phải match với Client ID trong Google Console.

### Xem Browser Console

1. Mở Developer Tools (F12)
2. Tab Console
3. Click login button
4. Xem error chi tiết

## Commands

```bash
make setup-frontend   # Chạy lại nếu đã sửa .env
make restart          # Restart services
```

---

**Tip**: Dùng Incognito/Private mode để test tránh cache.
