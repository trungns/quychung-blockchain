# 🚀 HƯỚNG DẪN BUILD VÀ DEPLOY ỨNG DỤNG

## 📦 Kiến trúc mới: Single Service (Backend + Frontend Embedded)

Thay vì chạy 2 services riêng biệt (backend + frontend), giờ đây:
- ✅ **Frontend được build và embed vào Go binary**
- ✅ **Chỉ cần 1 Docker image duy nhất**
- ✅ **Chỉ cần 1 Kubernetes Deployment**
- ✅ **Giảm độ phức tạp và chi phí resources**

---

## 🏗️ CÁCH HOẠT ĐỘNG

```
┌─────────────────────────────────────────────────┐
│  Docker Build Process                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Stage 1: Build Frontend (Node.js)              │
│  ├─ npm install                                 │
│  ├─ npm run build                               │
│  └─ Output: /frontend/build/                    │
│       ├─ index.html                             │
│       ├─ static/js/*.js                         │
│       └─ static/css/*.css                       │
│                                                 │
│  Stage 2: Build Backend (Go)                    │
│  ├─ Copy frontend/build → backend/cmd/static/   │
│  ├─ go build (with //go:embed static/*)         │
│  └─ Output: main (binary with embedded files)   │
│                                                 │
│  Stage 3: Runtime (Alpine)                      │
│  └─ Copy main binary (contains frontend!)       │
│                                                 │
└─────────────────────────────────────────────────┘

Kết quả: Binary "main" chứa cả backend logic + frontend files!
```

---

## 🔨 BUILD DOCKER IMAGE

### Bước 1: Build image từ root directory

```bash
cd /Users/trungns/training/blockchain/quychung

# Build image với Dockerfile.combined
docker build -f Dockerfile.combined -t quychung-app:latest .
```

### Bước 2: Test image locally

```bash
# Run container
docker run -d \
  --name quychung-app \
  -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=quychung \
  -e DB_PASSWORD=quychung123 \
  -e DB_NAME=quychung \
  -e BLOCKCHAIN_RPC=https://rpc-amoy.polygon.technology \
  -e TREASURY_PRIVATE_KEY=<your-private-key> \
  -e JWT_SECRET=<your-jwt-secret> \
  -e GOOGLE_CLIENT_ID=<your-client-id> \
  -e GOOGLE_CLIENT_SECRET=<your-client-secret> \
  -e GOOGLE_REDIRECT_URL=http://localhost:8080/auth/callback \
  quychung-app:latest

# Kiểm tra logs
docker logs -f quychung-app

# Test
# Frontend: http://localhost:8080
# API: http://localhost:8080/api/health
```

### Bước 3: Push lên Docker Hub

```bash
# Login Docker Hub
docker login

# Tag image
docker tag quychung-app:latest your-dockerhub-username/quychung-app:v1.0
docker tag quychung-app:latest your-dockerhub-username/quychung-app:latest

# Push
docker push your-dockerhub-username/quychung-app:v1.0
docker push your-dockerhub-username/quychung-app:latest
```

---

## ☸️ DEPLOY LÊN KUBERNETES/DEVTRON

### Cấu trúc K8s Manifests mới:

```
k8s/
├── namespace.yaml                  # Namespace quychung
├── configmap.yaml                  # Non-sensitive config
├── secret.yaml                     # Secrets (gitignored)
├── postgres-statefulset.yaml      # PostgreSQL database
├── app-deployment.yaml             # ⭐ UNIFIED APP (Backend + Frontend)
├── ingress.yaml                    # HTTP/HTTPS routing
└── hpa.yaml                        # Auto-scaling
```

**Đã XÓA:**
- ❌ `backend-deployment.yaml` (replaced by app-deployment.yaml)
- ❌ `frontend-deployment.yaml` (frontend embedded in app)

### Deploy trên Devtron:

#### 1. Tạo Application trên Devtron

- Application Name: `quychung`
- Git Repository: `https://github.com/your-username/quychung-blockchain`
- Deployment Path: `k8s/`

#### 2. Configure Secrets

Vào **Secrets** → Create new secret với kiểu **Opaque**:

```
Key                      | Value (từ SECRETS_FOR_DEVTRON.txt)
------------------------|------------------------------------------
treasury-private-key    | <from SECRETS_FOR_DEVTRON.txt>
db-password             | <from SECRETS_FOR_DEVTRON.txt>
jwt-secret              | <from SECRETS_FOR_DEVTRON.txt>
google-client-id        | <from SECRETS_FOR_DEVTRON.txt>
google-client-secret    | <from SECRETS_FOR_DEVTRON.txt>
```

#### 3. Update Docker Image

Sửa file `k8s/app-deployment.yaml`:

```yaml
spec:
  containers:
  - name: app
    image: your-dockerhub-username/quychung-app:latest  # ← Sửa thành username của bạn
```

#### 4. Deploy

Trên Devtron:
1. Click **Deploy**
2. Select **main** branch
3. Click **Deploy**

Devtron sẽ tự động:
- ✅ Pull code từ GitHub
- ✅ Apply tất cả K8s manifests
- ✅ Deploy PostgreSQL StatefulSet
- ✅ Deploy App (backend + frontend embedded)
- ✅ Setup Ingress routing
- ✅ Configure HPA auto-scaling

---

## 🎯 KIỂM TRA SAU KHI DEPLOY

### 1. Kiểm tra Pods

```bash
kubectl get pods -n quychung

# Kết quả mong đợi:
# NAME                           READY   STATUS    RESTARTS   AGE
# postgres-0                     1/1     Running   0          5m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          3m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          3m
```

### 2. Kiểm tra Services

```bash
kubectl get svc -n quychung

# Kết quả mong đợi:
# NAME              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# postgres-service  ClusterIP   10.x.x.x        <none>        5432/TCP   5m
# app-service       ClusterIP   10.x.x.x        <none>        80/TCP     3m
```

### 3. Kiểm tra Logs

```bash
# App logs
kubectl logs -n quychung -l app=quychung,component=app -f

# PostgreSQL logs
kubectl logs -n quychung postgres-0 -f
```

### 4. Test ứng dụng

```bash
# Port forward để test local
kubectl port-forward -n quychung svc/app-service 8080:80

# Truy cập:
# Frontend: http://localhost:8080
# API Health: http://localhost:8080/api/health
```

---

## 🔄 UPDATE ỨNG DỤNG

### Khi có code mới:

```bash
# 1. Build image mới với version tag
docker build -f Dockerfile.combined -t quychung-app:v1.1 .
docker tag quychung-app:v1.1 your-dockerhub-username/quychung-app:v1.1
docker tag quychung-app:v1.1 your-dockerhub-username/quychung-app:latest

# 2. Push lên Docker Hub
docker push your-dockerhub-username/quychung-app:v1.1
docker push your-dockerhub-username/quychung-app:latest

# 3. Update deployment (nếu dùng kubectl)
kubectl rollout restart deployment quychung-app -n quychung

# Hoặc trên Devtron: Click "Redeploy"
```

---

## 📊 LỢI ÍCH CỦA KIẾN TRÚC MỚI

| Trước (2 Services) | Sau (1 Service) |
|-------------------|-----------------|
| 2 Docker images | 1 Docker image |
| 2 Deployments | 1 Deployment |
| 2 Services | 1 Service |
| Phức tạp Ingress routing | Đơn giản: route tất cả đến app |
| CORS config giữa services | Không cần CORS (same origin) |
| 2x resources | 1x resources |
| Khó debug | Dễ debug (1 service) |

---

## 🚨 TROUBLESHOOTING

### Lỗi: "failed to load embedded static files"

**Nguyên nhân:** Frontend chưa được build hoặc sai path

**Giải quyết:**
```bash
# Build lại image, đảm bảo frontend được build
docker build -f Dockerfile.combined -t quychung-app:latest .
```

### Lỗi: "404 Not Found" cho static files

**Nguyên nhân:** Go embed path không đúng

**Kiểm tra:**
```bash
# Xem cấu trúc bên trong image
docker run --rm quychung-app:latest ls -la /root/
```

### Lỗi: "Failed to connect to database"

**Nguyên nhân:** Secrets không đúng hoặc PostgreSQL chưa ready

**Giải quyết:**
```bash
# Kiểm tra PostgreSQL
kubectl get pods -n quychung | grep postgres

# Kiểm tra secrets
kubectl get secrets -n quychung blockchain-secrets -o yaml
```

---

**Chúc bạn deploy thành công! 🎉**
