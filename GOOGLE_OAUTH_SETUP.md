# Hướng dẫn Setup Google OAuth

## Lỗi "Missing required parameter: client_id"

Nếu bạn gặp lỗi này khi login, có nghĩa frontend chưa nhận được Google Client ID.

## Giải pháp

### Bước 1: Đảm bảo .env đã được config

Mở file `.env` và kiểm tra có các dòng sau:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Lưu ý**: `REACT_APP_GOOGLE_CLIENT_ID` phải giống với `GOOGLE_CLIENT_ID`

### Bước 2: Chạy script setup frontend

```bash
make setup-frontend
```

Hoặc:

```bash
./scripts/generate-frontend-env.sh
```

### Bước 3: Hard refresh browser

Mở http://localhost:3000 và nhấn:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

## Tạo Google OAuth Credentials

Nếu chưa có credentials, làm theo các bước sau:

### 1. Truy cập Google Cloud Console

https://console.cloud.google.com/

### 2. Tạo Project (nếu chưa có)

- Click "Select a project" → "New Project"
- Nhập tên: "Quỹ Chung"
- Click "Create"

### 3. Configure OAuth Consent Screen

- Vào: APIs & Services → OAuth consent screen
- Chọn "External" → Create
- Điền thông tin:
  - App name: `Quỹ Chung`
  - User support email: your-email@gmail.com
  - Developer contact: your-email@gmail.com
- Save and Continue (bỏ qua các bước khác)

### 4. Tạo OAuth Client ID

- Vào: APIs & Services → Credentials
- Click "Create Credentials" → "OAuth client ID"
- Application type: **Web application**
- Name: `Quỹ Chung Web Client`
- Authorized redirect URIs:
  - `http://localhost:3000`
  - `http://localhost:3000/auth/callback`
- Click "Create"

### 5. Copy Credentials

Bạn sẽ nhận được:
- **Client ID**: Dạng `xxxxx.apps.googleusercontent.com`
- **Client Secret**: Dạng `GOCSPX-xxxxx`

### 6. Cập nhật .env

```bash
GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
REACT_APP_GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
```

### 7. Setup lại frontend

```bash
make setup-frontend
```

### 8. Test

- Mở http://localhost:3000
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Click "Sign in with Google"
- Chọn tài khoản Google
- Cho phép app truy cập

## Kiểm tra

Nếu setup đúng:

1. File `http://localhost:3000/env-config.js` phải accessible
2. Console browser không có lỗi về client_id
3. Google login button hiển thị bình thường
4. Click vào button mở popup Google login

## Troubleshooting

### Vẫn báo lỗi client_id sau khi setup?

```bash
# Xóa cache browser hoàn toàn
# Chrome: Settings → Privacy → Clear browsing data → Cached images

# Hoặc thử incognito mode
```

### Redirect URI mismatch?

Đảm bảo trong Google Cloud Console có thêm:
- `http://localhost:3000`
- `http://localhost:3000/auth/callback`

### Frontend không restart?

```bash
docker-compose restart frontend
```

## Commands hữu ích

```bash
make setup-frontend          # Setup frontend với Google OAuth
make restart                 # Restart tất cả services
docker-compose logs frontend # Xem logs frontend
```
