# ⚡ QUICK START - DEPLOY NHANH

## 🚀 3 BƯỚC ĐỂ DEPLOY

### 1️⃣ Build & Push Images (5 phút)

```bash
cd /Users/trungns/training/blockchain/quychung

# Build
docker-compose build backend frontend

# Login Docker Hub
docker login

# Tag (thay YOUR_DOCKERHUB_USERNAME)
docker tag quychung-backend YOUR_DOCKERHUB_USERNAME/quychung-backend:v1.0.0
docker tag quychung-frontend YOUR_DOCKERHUB_USERNAME/quychung-frontend:v1.0.0

# Push
docker push YOUR_DOCKERHUB_USERNAME/quychung-backend:v1.0.0
docker push YOUR_DOCKERHUB_USERNAME/quychung-frontend:v1.0.0
```

### 2️⃣ Cập Nhật Config (2 phút)

```bash
# Sửa 3 files:

# File 1: k8s/backend-deployment.yaml (dòng 17)
image: YOUR_DOCKERHUB_USERNAME/quychung-backend:v1.0.0

# File 2: k8s/frontend-deployment.yaml (dòng 17)
image: YOUR_DOCKERHUB_USERNAME/quychung-frontend:v1.0.0

# File 3: k8s/ingress.yaml (dòng 40, 50)
- host: YOUR_DOMAIN.com        # Frontend
- host: api.YOUR_DOMAIN.com    # Backend
```

### 3️⃣ Deploy (1 lệnh)

```bash
# Deploy tất cả
kubectl apply -f k8s/

# Xem kết quả
kubectl get pods -n quychung
```

---

## 📋 HOẶC DEPLOY TỪNG BƯỚC

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

---

## 🎨 DEVTRON (Dễ hơn)

1. **Push code lên GitHub**
2. **Vào Devtron UI** → Create App
3. **Connect Git:** `https://github.com/YOUR_USERNAME/quychung`
4. **Path:** `k8s/`
5. **Click Deploy** → Done!

---

## ✅ KIỂM TRA

```bash
# Pods đang chạy?
kubectl get pods -n quychung

# Xem logs
kubectl logs -f deployment/backend -n quychung

# Get external IP
kubectl get ingress -n quychung
```

---

## 🆘 LỖI THƯỜNG GẶP

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| ImagePullBackOff | Sai tên image | Kiểm tra lại image path |
| CrashLoopBackOff | App crash | Xem logs: `kubectl logs <pod>` |
| Pending | Không đủ resources | Scale cluster lên |

---

**Đọc thêm:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
