# 🚀 HƯỚNG DẪN DEPLOY LÊN DEVTRON

## 📋 DANH SÁCH FILES

```
k8s/
├── README.md                    ← Giải thích về K8s Secrets
├── DEPLOYMENT_GUIDE.md          ← File này (hướng dẫn deploy)
├── namespace.yaml               ← Tạo namespace "quychung"
├── secret.yaml                  ← Secrets (passwords, private keys)
├── configmap.yaml               ← Config (contract ABI, env vars)
├── postgres-statefulset.yaml    ← PostgreSQL database
├── backend-deployment.yaml      ← Backend API (Golang)
├── frontend-deployment.yaml     ← Frontend (React)
├── ingress.yaml                 ← Expose ra internet
└── hpa.yaml                     ← Auto-scaling
```

---

## 🎯 THỨ TỰ DEPLOY

### Bước 1: Chuẩn bị Docker Images

```bash
# 1. Build images
docker-compose build backend frontend

# 2. Login Docker Hub
docker login

# 3. Tag images
docker tag quychung-backend <your-dockerhub>/quychung-backend:v1.0.0
docker tag quychung-frontend <your-dockerhub>/quychung-frontend:v1.0.0

# 4. Push lên registry
docker push <your-dockerhub>/quychung-backend:v1.0.0
docker push <your-dockerhub>/quychung-frontend:v1.0.0
```

**Thay `<your-dockerhub>` bằng username Docker Hub của bạn**

### Bước 2: Cập nhật Image Paths

```bash
# Sửa trong backend-deployment.yaml
image: your-registry/quychung-backend:latest
# → Đổi thành:
image: <your-dockerhub>/quychung-backend:v1.0.0

# Sửa trong frontend-deployment.yaml
image: your-registry/quychung-frontend:latest
# → Đổi thành:
image: <your-dockerhub>/quychung-frontend:v1.0.0
```

### Bước 3: Cập nhật Domain Names

```bash
# Sửa trong ingress.yaml
- host: your-domain.com
  # → Đổi thành domain thật của bạn
  # Ví dụ: quychung.com

- host: api.your-domain.com
  # → Đổi thành:
  # Ví dụ: api.quychung.com

# Sửa trong configmap.yaml
GOOGLE_REDIRECT_URL: "https://your-domain.com/auth/callback"
# → Đổi thành domain thật
```

---

## 🔧 DEPLOY BẰNG KUBECTL (Trực tiếp)

### Deploy theo thứ tự:

```bash
# 1. Tạo namespace
kubectl apply -f k8s/namespace.yaml

# 2. Tạo secrets (QUAN TRỌNG: Làm trước!)
kubectl apply -f k8s/secret.yaml

# 3. Tạo ConfigMaps
kubectl apply -f k8s/configmap.yaml

# 4. Deploy PostgreSQL
kubectl apply -f k8s/postgres-statefulset.yaml

# 5. Đợi PostgreSQL ready
kubectl wait --for=condition=ready pod -l app=postgres -n quychung --timeout=300s

# 6. Deploy Backend
kubectl apply -f k8s/backend-deployment.yaml

# 7. Deploy Frontend
kubectl apply -f k8s/frontend-deployment.yaml

# 8. Deploy Ingress (expose ra internet)
kubectl apply -f k8s/ingress.yaml

# 9. (Optional) Deploy HPA cho auto-scaling
kubectl apply -f k8s/hpa.yaml
```

### Kiểm tra deployment:

```bash
# Xem tất cả resources
kubectl get all -n quychung

# Xem pods
kubectl get pods -n quychung

# Xem logs backend
kubectl logs -f deployment/backend -n quychung

# Xem logs frontend
kubectl logs -f deployment/frontend -n quychung

# Describe pod nếu có lỗi
kubectl describe pod <pod-name> -n quychung
```

---

## 🎨 DEPLOY BẰNG DEVTRON (Recommended)

### Bước 1: Setup Devtron

Nếu chưa có Devtron, cài đặt:

```bash
# Cài Devtron (chạy trong K8s cluster)
helm repo add devtron https://helm.devtron.ai
helm repo update
helm install devtron devtron/devtron-operator \
  --create-namespace --namespace devtroncd \
  --set installer.modules={cicd}
```

Truy cập Devtron UI:
```bash
kubectl get svc -n devtroncd devtron-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
# Mở browser: http://<IP>:32080
```

### Bước 2: Tạo Application trong Devtron

**Option 1: Import từ Git (Recommended)**

1. **Create Application:**
   - App Name: `quychung`
   - Project: `default` hoặc tạo mới

2. **Connect Git Repository:**
   - Git URL: `https://github.com/<your-username>/quychung`
   - Branch: `main`
   - Path: `k8s/`

3. **Configure:**
   - Environment: `production`
   - Namespace: `quychung`
   - Auto-sync: Enabled

4. **Deploy:**
   - Devtron tự động phát hiện tất cả YAML files
   - Click "Deploy" → Devtron tự apply theo đúng thứ tự

**Option 2: Upload YAML Files**

1. Vào Devtron UI → Applications → Create
2. Choose "Helm Chart" hoặc "Manifest"
3. Upload từng file YAML trong thư mục `k8s/`
4. Deploy

### Bước 3: Cấu hình Secrets trong Devtron

Devtron có UI để tạo Secrets (không cần encode base64thủ công):

1. Vào **Application** → **Secrets**
2. Click **Add Secret**
3. Chọn **Opaque**
4. Thêm key-value pairs:
   ```
   treasury-private-key: <your-private-key-from-.env>
   db-password: <your-database-password>
   jwt-secret: your-super-secret-jwt-key-change-in-production
   google-client-id: <your-google-client-id>
   google-client-secret: <your-google-client-secret>
   ```
5. Save → Devtron tự động encode base64!

### Bước 4: Monitor & Manage

Devtron cung cấp:
- **Real-time logs:** Xem logs của tất cả pods
- **Resource metrics:** CPU, Memory usage
- **Pod status:** Running, Pending, Failed
- **Rollback:** Quay lại version trước nếu lỗi
- **Auto-sync:** Tự động deploy khi có commit mới

---

## 🔍 TROUBLESHOOTING

### 1. Pods không start được

```bash
# Xem lỗi
kubectl describe pod <pod-name> -n quychung

# Các lỗi thường gặp:
# - ImagePullBackOff: Sai image name hoặc registry
# - CrashLoopBackOff: App crash khi start
# - Pending: Không đủ resources (CPU/Memory)
```

### 2. Backend không kết nối được PostgreSQL

```bash
# Kiểm tra PostgreSQL đang chạy
kubectl get pods -n quychung -l app=postgres

# Xem logs PostgreSQL
kubectl logs -f statefulset/postgres -n quychung

# Test kết nối từ backend pod
kubectl exec -it <backend-pod> -n quychung -- sh
nc -zv postgres-service 5432
```

### 3. Secrets không hoạt động

```bash
# Kiểm tra secret tồn tại
kubectl get secrets -n quychung

# Xem chi tiết
kubectl describe secret blockchain-secrets -n quychung

# Verify giá trị (decode base64)
kubectl get secret blockchain-secrets -n quychung -o jsonpath='{.data.treasury-private-key}' | base64 -d
```

### 4. Ingress không expose ra ngoài

```bash
# Kiểm tra Ingress
kubectl get ingress -n quychung

# Xem chi tiết
kubectl describe ingress quychung-ingress -n quychung

# Kiểm tra Ingress Controller có chạy không
kubectl get pods -n ingress-nginx  # hoặc kube-system
```

---

## 📊 MONITORING & LOGGING

### 1. Xem logs realtime

```bash
# Backend
kubectl logs -f deployment/backend -n quychung --tail=100

# Frontend
kubectl logs -f deployment/frontend -n quychung --tail=100

# PostgreSQL
kubectl logs -f statefulset/postgres -n quychung --tail=100

# Tất cả pods
stern quychung -n quychung  # Cần cài stern
```

### 2. Xem resource usage

```bash
# CPU & Memory của pods
kubectl top pods -n quychung

# Chi tiết resources
kubectl describe nodes
```

### 3. Events

```bash
# Xem events gần đây
kubectl get events -n quychung --sort-by='.lastTimestamp'
```

---

## 🔄 UPDATE & ROLLBACK

### Update image mới:

```bash
# Build & push image mới
docker build -t <your-dockerhub>/quychung-backend:v1.0.1 backend/
docker push <your-dockerhub>/quychung-backend:v1.0.1

# Update deployment
kubectl set image deployment/backend backend=<your-dockerhub>/quychung-backend:v1.0.1 -n quychung

# Hoặc edit deployment
kubectl edit deployment backend -n quychung
```

### Rollback về version cũ:

```bash
# Xem history
kubectl rollout history deployment/backend -n quychung

# Rollback về version trước
kubectl rollout undo deployment/backend -n quychung

# Rollback về version cụ thể
kubectl rollout undo deployment/backend --to-revision=2 -n quychung
```

---

## 🗑️ XÓA TOÀN BỘ

```bash
# Xóa tất cả resources trong namespace
kubectl delete namespace quychung

# Hoặc xóa từng cái
kubectl delete -f k8s/
```

---

## 📚 CHECKLIST TRƯỚC KHI DEPLOY

- [ ] Đã build và push Docker images lên registry
- [ ] Đã cập nhật image paths trong deployment files
- [ ] Đã cập nhật domain names trong ingress.yaml
- [ ] Đã cập nhật GOOGLE_REDIRECT_URL trong configmap.yaml
- [ ] Đã tạo secrets với private keys thật (production)
- [ ] Đã có Kubernetes cluster (GKE, EKS, AKS, hoặc Devtron)
- [ ] Đã cài Ingress Controller (nginx, traefik, etc.)
- [ ] Đã có domain name trỏ về cluster
- [ ] Đã cài Cert-Manager cho SSL (optional)
- [ ] Đã backup database nếu có data quan trọng

---

## 🎯 PRODUCTION RECOMMENDATIONS

### 1. Security

- [ ] Đổi tất cả default passwords
- [ ] Dùng strong JWT secret (random 64 chars)
- [ ] Dùng External Secrets Operator thay vì hard-code secrets
- [ ] Enable Network Policies
- [ ] Enable Pod Security Policies
- [ ] Scan images với Trivy hoặc Snyk

### 2. Monitoring

- [ ] Setup Prometheus + Grafana
- [ ] Setup centralized logging (ELK, Loki)
- [ ] Setup alerting (PagerDuty, Slack)
- [ ] Monitor blockchain transactions

### 3. Backup

- [ ] Backup PostgreSQL định kỳ (Velero, pg_dump)
- [ ] Test restore process
- [ ] Store backups off-cluster

### 4. Performance

- [ ] Enable HPA (Horizontal Pod Autoscaler)
- [ ] Set resource requests/limits đúng
- [ ] Use CDN cho frontend (Cloudflare, AWS CloudFront)
- [ ] Enable caching (Redis)

---

**Good luck với deployment! 🚀**

Nếu gặp vấn đề, hãy check Devtron logs hoặc kubectl logs.
