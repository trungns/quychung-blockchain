# 🧪 HƯỚNG DẪN TEST ỨNG DỤNG

## 3 Cách Test

### 1️⃣ Test Nhanh: Go Compilation (5 giây)

```bash
cd backend

# Tạo static folder giả
mkdir -p cmd/static
touch cmd/static/index.html

# Test compile
go build -o /tmp/test-main ./cmd/main.go

# Nếu SUCCESS → Code syntax OK!
```

---

### 2️⃣ Test Docker Build (3-5 phút)

```bash
cd /Users/trungns/training/blockchain/quychung

# Build image
docker build -f Dockerfile.combined -t quychung-app:test .

# Nếu build thành công → Docker image OK!
```

**Kiểm tra image:**
```bash
# Xem size
docker images | grep quychung-app

# Kết quả mong đợi: ~100-150MB

# Xem cấu trúc bên trong
docker run --rm quychung-app:test ls -la /root/
# Phải có: main (binary), contracts/
```

---

### 3️⃣ Test Full Stack (Run Docker)

#### Bước 1: Start PostgreSQL

```bash
# Nếu chưa có postgres
docker-compose up -d postgres

# Kiểm tra
docker ps | grep postgres
```

#### Bước 2: Run App Container

```bash
docker run -d \
  --name quychung-app-test \
  -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=quychung \
  -e DB_PASSWORD=quychung123 \
  -e DB_NAME=quychung \
  -e BLOCKCHAIN_RPC=https://rpc-amoy.polygon.technology \
  -e TREASURY_PRIVATE_KEY=0xf608d9fad2f4f7fb588aac7ea8b3c32d976d2769044d90db2762a71ca6f10086 \
  -e JWT_SECRET=test-secret \
  -e GOOGLE_CLIENT_ID=test-id \
  -e GOOGLE_CLIENT_SECRET=test-secret \
  -e GOOGLE_REDIRECT_URL=http://localhost:8080/auth/callback \
  quychung-app:test
```

#### Bước 3: Kiểm tra Logs

```bash
# Xem logs
docker logs -f quychung-app-test

# Kết quả mong đợi:
# Server starting on port 8080
# API available at: http://localhost:8080/api
# Frontend available at: http://localhost:8080
```

#### Bước 4: Test Endpoints

```bash
# Test API
curl http://localhost:8080/api/health
# Kết quả: {"status":"ok"}

# Test Frontend
curl -I http://localhost:8080/
# Kết quả: HTTP/1.1 200 OK
#          Content-Type: text/html
```

#### Bước 5: Test trong Browser

```
Open: http://localhost:8080
```

Bạn sẽ thấy React frontend!

#### Cleanup

```bash
# Stop và xóa container
docker stop quychung-app-test
docker rm quychung-app-test

# Xóa image test
docker rmi quychung-app:test
```

---

## 4️⃣ Test Kubernetes (Local)

### Prerequisites:
- Minikube/Kind/K3s đang chạy
- kubectl configured

### Test trên Local K8s:

```bash
cd /Users/trungns/training/blockchain/quychung

# 1. Apply namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets
kubectl create secret generic blockchain-secrets \
  --namespace=quychung \
  --from-literal=treasury-private-key=0xf608d9fad2f4f7fb588aac7ea8b3c32d976d2769044d90db2762a71ca6f10086 \
  --from-literal=db-password=quychung123 \
  --from-literal=jwt-secret=test-secret \
  --from-literal=google-client-id=test-id \
  --from-literal=google-client-secret=test-secret

# 3. Load image vào minikube (nếu dùng minikube)
minikube image load quychung-app:test

# 4. Deploy local environment
kubectl apply -f k8s/local/

# 5. Kiểm tra
kubectl get pods -n quychung

# Kết quả mong đợi:
# NAME                           READY   STATUS    RESTARTS   AGE
# postgres-0                     1/1     Running   0          1m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          30s

# 6. Port forward
kubectl port-forward -n quychung svc/app-service 8080:80

# 7. Test
curl http://localhost:8080/api/health
```

### Cleanup K8s:

```bash
kubectl delete -f k8s/local/
kubectl delete namespace quychung
```

---

## 🐛 Troubleshooting

### Lỗi: "net/http imported and not used"

```bash
# Xóa import không dùng
cd backend/cmd
sed -i '' '/"net\/http"/d' main.go
```

### Lỗi: Docker build failed - Frontend

```bash
# Kiểm tra frontend có build được không
cd frontend
npm install
npm run build

# Nếu OK → Thư mục build/ sẽ có index.html, static/
```

### Lỗi: Docker build failed - Backend

```bash
# Test Go build trước
cd backend
go build ./cmd/main.go

# Nếu lỗi → Sửa code
# Nếu OK → Lỗi ở Docker config
```

### Lỗi: "Cannot connect to database"

```bash
# Kiểm tra PostgreSQL
docker ps | grep postgres

# Nếu không chạy
docker-compose up -d postgres

# Test connection
docker exec -it quychung-postgres-1 psql -U quychung -d quychung -c "SELECT 1;"
```

### Lỗi: Frontend 404 Not Found

```bash
# Kiểm tra static files đã được embed chưa
docker run --rm quychung-app:test ls -la /root/

# Nếu không có cmd/static/ trong container
# → Lỗi trong Dockerfile build stage
```

---

## ✅ Checklist Test Hoàn Chỉnh

- [ ] Go compilation OK
- [ ] Docker build SUCCESS
- [ ] Docker image size hợp lý (~100-150MB)
- [ ] Container start OK (no errors in logs)
- [ ] Database connection OK
- [ ] API endpoint `/api/health` returns 200
- [ ] Frontend `/` returns HTML
- [ ] Frontend có thể login Google OAuth
- [ ] Có thể tạo treasury
- [ ] Transaction ghi lên blockchain testnet
- [ ] K8s pods running
- [ ] K8s port-forward hoạt động

---

**Nếu tất cả đều PASS → Sẵn sàng deploy production! 🚀**
