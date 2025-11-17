# 🚀 KUBERNETES DEPLOYMENT - QUYCHUNG PROJECT

## ✅ TÓM TẮT

**QUAN TRỌNG:** Source code backend **KHÔNG CẦN THAY ĐỔI**!

```go
// Backend code vẫn giống hệt như cũ:
privateKey := os.Getenv("TREASURY_PRIVATE_KEY")
// Nhận được: "0xf608..." (Kubernetes tự động decode base64)
```

---

## 🔐 KUBERNETES SECRETS - CÁCH HOẠT ĐỘNG

### 1. Bạn tạo Secret (base64):

```yaml
# secret.yaml
data:
  treasury-private-key: MHhmNjA4... # base64 của "0xf608..."
```

### 2. Deployment tham chiếu Secret:

```yaml
# backend-deployment.yaml
env:
- name: TREASURY_PRIVATE_KEY
  valueFrom:
    secretKeyRef:
      name: blockchain-secrets
      key: treasury-private-key
```

### 3. Kubernetes tự động decode:

```
Secret (base64) → Kubernetes decode → Biến môi trường (plain text)
MHhmNjA4...     → auto decode     → "0xf608..."
```

### 4. Backend nhận giá trị gốc:

```go
// Backend code KHÔNG ĐỔI
privateKey := os.Getenv("TREASURY_PRIVATE_KEY")
// ✅ Nhận được: "0xf608d9fad2f4f7fb588aac7ea8b3c32d976d2769044d90db2762a71ca6f10086"
```

---

## 📋 CÁC FILE TRONG THƯ MỤC NÀY

```
k8s/
├── README.md                    ← File này
├── secret.yaml                  ← Kubernetes Secrets (base64)
├── backend-deployment.yaml      ← Deploy backend + service
├── frontend-deployment.yaml     ← Deploy frontend (TODO)
├── postgres-statefulset.yaml    ← PostgreSQL với persistent volume (TODO)
└── namespace.yaml               ← Tạo namespace "quychung" (TODO)
```

---

## 🎯 ROADMAP DEPLOY LÊN KUBERNETES

### Bước 1: Chuẩn bị Docker Images

```bash
# Build images
docker-compose build backend frontend

# Tag cho registry
docker tag quychung-backend your-dockerhub/quychung-backend:v1.0
docker tag quychung-frontend your-dockerhub/quychung-frontend:v1.0

# Push lên Docker Hub
docker login
docker push your-dockerhub/quychung-backend:v1.0
docker push your-dockerhub/quychung-frontend:v1.0
```

### Bước 2: Tạo Namespace

```bash
kubectl create namespace quychung
```

### Bước 3: Apply Secrets

```bash
# Kiểm tra secrets trước khi apply
cat k8s/secret.yaml

# Apply
kubectl apply -f k8s/secret.yaml

# Verify
kubectl get secrets -n quychung
kubectl describe secret blockchain-secrets -n quychung
```

### Bước 4: Deploy Backend

```bash
# Sửa image path trong backend-deployment.yaml
# Đổi: your-registry/quychung-backend:latest
# Thành: your-dockerhub-username/quychung-backend:v1.0

# Apply
kubectl apply -f k8s/backend-deployment.yaml

# Verify
kubectl get deployments -n quychung
kubectl get pods -n quychung
kubectl logs -f <pod-name> -n quychung
```

---

## 🔍 KIỂM TRA SECRETS TRONG POD

### Xem biến môi trường trong pod:

```bash
# List pods
kubectl get pods -n quychung

# Exec vào pod
kubectl exec -it backend-xxxxx -n quychung -- sh

# Trong pod, xem env
env | grep TREASURY
# Output: TREASURY_PRIVATE_KEY=0xf608d9fad2f4f7fb588aac7ea8b3c32d976d2769044d90db2762a71ca6f10086
# ✅ Đã được decode tự động!
```

---

## ⚠️ LƯU Ý BẢO MẬT

### 1. KHÔNG commit secrets vào Git

```bash
# Thêm vào .gitignore
echo "k8s/secret.yaml" >> .gitignore
```

### 2. Cho Production: Dùng External Secrets

Thay vì hard-code secrets trong YAML, dùng:
- **Sealed Secrets:** Encrypt secrets trước khi commit Git
- **External Secrets Operator:** Sync từ AWS Secrets Manager / Google Secret Manager
- **HashiCorp Vault:** Centralized secrets management

### 3. RBAC (Role-Based Access Control)

Chỉ cho phép pods cần thiết đọc secrets:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: quychung
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: quychung
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["blockchain-secrets"]
  verbs: ["get"]
```

---

## 🧪 TEST LOCAL VỚI MINIKUBE

Nếu muốn test K8s local trước khi deploy production:

```bash
# Cài Minikube
brew install minikube

# Start cluster
minikube start

# Deploy
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/backend-deployment.yaml

# Xem logs
kubectl logs -f deployment/backend -n quychung

# Port-forward để test
kubectl port-forward svc/backend-service 8080:8080 -n quychung
# Truy cập: http://localhost:8080/api/health
```

---

## 📊 SO SÁNH: DOCKER COMPOSE VS KUBERNETES

| Khía cạnh | Docker Compose | Kubernetes |
|-----------|----------------|------------|
| **Secrets** | Hard-code trong .yml | Base64 trong Secret |
| **Env vars** | Trực tiếp | Tham chiếu từ Secret |
| **Backend code** | `os.Getenv("KEY")` | `os.Getenv("KEY")` ← GIỐNG! |
| **Giá trị nhận** | "0xf608..." | "0xf608..." ← GIỐNG! |
| **Bảo mật** | ❌ Ai cũng đọc được | ✅ RBAC + Encryption |

---

## ❓ FAQS

### Q: Backend code có cần đổi không?
**A:** KHÔNG! Code vẫn dùng `os.Getenv()` như bình thường.

### Q: Tại sao dùng base64?
**A:** Yêu cầu kỹ thuật của Kubernetes YAML, KHÔNG phải để bảo mật.

### Q: Base64 có an toàn không?
**A:** KHÔNG! Base64 chỉ là encoding, ai cũng decode được. Bảo mật thực sự đến từ RBAC + etcd encryption.

### Q: Production nên dùng gì?
**A:** External Secrets Operator hoặc Sealed Secrets để không commit secrets vào Git.

### Q: Devtron có tự động handle secrets không?
**A:** CÓ! Devtron có UI để tạo secrets, không cần viết YAML thủ công.

---

**Chúc bạn deploy thành công! 🎉**
