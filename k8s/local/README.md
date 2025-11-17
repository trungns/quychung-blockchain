# 🏠 Local/Development Deployment (với PostgreSQL StatefulSet)

## 📋 Cấu hình này dành cho:
- ✅ Local Kubernetes (minikube, kind, k3s)
- ✅ Development/Testing
- ✅ PostgreSQL chạy trong cluster (StatefulSet)

## 📂 Files cần deploy:

```
k8s/
├── namespace.yaml              # Namespace (shared)
├── local/
│   ├── configmap.yaml         # Config với postgres-service
│   ├── postgres-statefulset.yaml  # PostgreSQL trong cluster
│   ├── app-deployment.yaml    # App deployment
│   └── hpa.yaml               # Auto-scaling (optional)
```

## 🚀 Deploy Local

### Bước 1: Apply namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Bước 2: Tạo secrets

```bash
kubectl create secret generic blockchain-secrets \
  --namespace=quychung \
  --from-literal=treasury-private-key=<from-SECRETS_FOR_DEVTRON.txt> \
  --from-literal=db-password=<from-SECRETS_FOR_DEVTRON.txt> \
  --from-literal=jwt-secret=<from-SECRETS_FOR_DEVTRON.txt> \
  --from-literal=google-client-id=<from-SECRETS_FOR_DEVTRON.txt> \
  --from-literal=google-client-secret=<from-SECRETS_FOR_DEVTRON.txt>
```

### Bước 3: Deploy all services

```bash
kubectl apply -f k8s/local/
```

### Bước 4: Kiểm tra

```bash
# Xem pods
kubectl get pods -n quychung

# Kết quả mong đợi:
# NAME                           READY   STATUS    RESTARTS   AGE
# postgres-0                     1/1     Running   0          2m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          1m

# Xem services
kubectl get svc -n quychung

# Port forward để test
kubectl port-forward -n quychung svc/app-service 8080:80

# Truy cập:
# Frontend: http://localhost:8080
# API: http://localhost:8080/api/health
```

## 🗄️ Quản lý PostgreSQL Data

### Xem data volume

```bash
kubectl get pvc -n quychung
```

### Backup data

```bash
kubectl exec -n quychung postgres-0 -- pg_dump -U quychung quychung > backup.sql
```

### Restore data

```bash
cat backup.sql | kubectl exec -i -n quychung postgres-0 -- psql -U quychung quychung
```

### Xóa data (reset)

```bash
kubectl delete pvc -n quychung postgres-storage-postgres-0
kubectl delete pod -n quychung postgres-0
```

## 🔄 Update Application

```bash
# Rebuild image
docker build -f Dockerfile.combined -t quychung-app:latest .

# Load vào minikube (nếu dùng minikube)
minikube image load quychung-app:latest

# Restart deployment
kubectl rollout restart deployment quychung-app -n quychung
```

---

**Lưu ý:** PostgreSQL StatefulSet chỉ dùng cho local/dev, KHÔNG dùng cho production!
