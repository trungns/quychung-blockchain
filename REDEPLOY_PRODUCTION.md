# 🚀 HƯỚNG DẪN REBUILD VÀ REDEPLOY LÊN DEVTRON

## Vấn đề đã sửa:
- ✅ Frontend không còn gọi `http://localhost:8080/api`
- ✅ Sử dụng relative path `/api` (tự động dùng domain hiện tại)
- ✅ Backend cho phép CORS từ production domain
- ✅ Không còn lỗi "due to access control checks"

---

## 📦 Bước 1: Rebuild Docker Image

```bash
cd /Users/trungns/training/blockchain/quychung

# Pull code mới nhất
git pull origin main

# Build Docker image với version tag
docker build -f Dockerfile.combined -t quychung-app:v1.1 .

# Nếu build thành công, tiếp tục...
```

---

## 🏷️ Bước 2: Tag và Push lên Docker Registry

### Nếu dùng Docker Hub:

```bash
# Login (nếu chưa)
docker login

# Tag image
docker tag quychung-app:v1.1 YOUR_DOCKERHUB_USERNAME/quychung-app:v1.1
docker tag quychung-app:v1.1 YOUR_DOCKERHUB_USERNAME/quychung-app:latest

# Push
docker push YOUR_DOCKERHUB_USERNAME/quychung-app:v1.1
docker push YOUR_DOCKERHUB_USERNAME/quychung-app:latest
```

### Nếu dùng registry khác (GCR, ECR, etc):

```bash
# Tag với registry URL
docker tag quychung-app:v1.1 <your-registry>/quychung-app:v1.1

# Push
docker push <your-registry>/quychung-app:v1.1
```

---

## ☸️ Bước 3: Update Kubernetes Deployment

### Cách 1: Thông qua Devtron UI (Khuyến nghị)

1. Vào Devtron Dashboard
2. Chọn app `quychung`
3. Click **"Redeploy"** hoặc **"Trigger Deployment"**
4. Devtron sẽ tự pull image mới từ registry
5. Đợi pods restart

### Cách 2: Thông qua kubectl

```bash
# Restart deployment để pull image mới
kubectl rollout restart deployment quychung-app -n quychung

# Kiểm tra status
kubectl rollout status deployment quychung-app -n quychung

# Xem pods mới
kubectl get pods -n quychung
```

### Cách 3: Update image tag trong Git

Nếu Devtron setup GitOps:

1. Sửa file `k8s/production/app-deployment.yaml`
2. Thay `image: your-registry/quychung-app:latest` → `image: your-registry/quychung-app:v1.1`
3. Commit và push
4. Devtron tự động sync

---

## ✅ Bước 4: Verify Deployment

### 4.1. Kiểm tra Pods

```bash
kubectl get pods -n quychung

# Kết quả mong đợi:
# NAME                           READY   STATUS    RESTARTS   AGE
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          2m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          2m
```

### 4.2. Kiểm tra Logs

```bash
kubectl logs -n quychung -l app=quychung,component=app --tail=50

# Tìm dòng:
# Server starting on port 8080
# API available at: http://localhost:8080/api
# Frontend available at: http://localhost:8080
```

### 4.3. Test trên Browser

1. Mở: https://quychung.wellytech.vn
2. Click "Login with Google"
3. **KHÔNG còn lỗi CORS**
4. Login thành công!

### 4.4. Test API trực tiếp

```bash
# Health check
curl https://quychung.wellytech.vn/api/health

# Kết quả mong đợi:
# {"status":"ok"}
```

---

## 🐛 Troubleshooting

### Lỗi: Image pull failed

```bash
# Kiểm tra image có tồn tại không
docker images | grep quychung-app

# Kiểm tra registry credentials
kubectl get secret -n quychung
```

**Giải quyết:** Đảm bảo đã push image lên registry và Devtron có quyền pull.

### Lỗi: Pods không restart

```bash
# Force delete pods cũ
kubectl delete pods -n quychung -l app=quychung,component=app

# Pods mới sẽ tự động tạo
```

### Lỗi: Vẫn còn CORS error

**Nguyên nhân:** Browser cache frontend cũ

**Giải quyết:**
1. Hard refresh: Ctrl+Shift+R (Windows) hoặc Cmd+Shift+R (Mac)
2. Clear browser cache
3. Mở Incognito/Private window

### Lỗi: "Network error" khi login

**Kiểm tra:**

```bash
# Xem logs backend
kubectl logs -n quychung -l app=quychung,component=app -f

# Kiểm tra Google OAuth callback URL
```

**Đảm bảo:**
- Google OAuth callback URL = `https://quychung.wellytech.vn/auth/callback`
- GOOGLE_REDIRECT_URL env var đúng trong ConfigMap

---

## 📝 Checklist Deployment

- [ ] Git pull latest code
- [ ] Docker build successful
- [ ] Image pushed to registry
- [ ] Deployment restarted on Devtron
- [ ] Pods running (2/2 ready)
- [ ] No errors in logs
- [ ] Frontend loads at https://quychung.wellytech.vn
- [ ] Login button works (no CORS error)
- [ ] Can login with Google successfully
- [ ] API calls work from frontend

---

## 🎉 Sau khi Deploy thành công

Frontend sẽ tự động gọi đúng API:
- ✅ Production: `https://quychung.wellytech.vn/api/...`
- ✅ Development: `http://localhost:3000/api/...` (proxied to backend)

Không cần config gì thêm! 🚀
