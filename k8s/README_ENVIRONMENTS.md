# 🌍 Kubernetes Deployment Environments

## 📁 Cấu trúc thư mục

```
k8s/
├── namespace.yaml                    # Shared - Dùng cho cả 2 môi trường
├── secret.yaml                       # Template (gitignored)
│
├── local/                            # 🏠 Local/Development Environment
│   ├── README.md
│   ├── configmap.yaml               # DB host = postgres-service
│   ├── postgres-statefulset.yaml   # ⭐ PostgreSQL trong cluster
│   ├── app-deployment.yaml
│   └── hpa.yaml
│
└── production/                       # 🚀 Production/Devtron Environment
    ├── README.md
    ├── configmap.yaml               # DB host = RDS endpoint
    ├── app-deployment.yaml          # ⭐ KHÔNG có PostgreSQL
    ├── ingress.yaml                 # Domain thật + TLS
    └── hpa.yaml
```

## 🔄 So sánh 2 môi trường

| Feature | Local (`k8s/local/`) | Production (`k8s/production/`) |
|---------|---------------------|-------------------------------|
| **PostgreSQL** | StatefulSet trong cluster | RDS PostgreSQL (external) |
| **DB Host** | `postgres-service` | RDS endpoint |
| **Domain** | `localhost` + port-forward | Domain thật với TLS |
| **Ingress** | Không cần | Có (với cert-manager) |
| **Replicas** | 1 | 2-10 (auto-scale) |
| **Resources** | Nhỏ (dev) | Production-sized |
| **Secrets** | kubectl create | Devtron Secrets Manager |
| **Persistent Volume** | Local PVC | RDS managed storage |

---

## 🏠 LOCAL DEPLOYMENT

### Use Case:
- Development trên laptop
- Testing trên minikube/kind/k3s
- CI/CD pipeline testing

### Quick Start:

```bash
# 1. Tạo namespace
kubectl apply -f k8s/namespace.yaml

# 2. Tạo secrets
kubectl create secret generic blockchain-secrets \
  --namespace=quychung \
  --from-file=k8s/secret.yaml  # Hoặc từ SECRETS_FOR_DEVTRON.txt

# 3. Deploy tất cả
kubectl apply -f k8s/local/

# 4. Port forward
kubectl port-forward -n quychung svc/app-service 8080:80

# 5. Truy cập: http://localhost:8080
```

### Đặc điểm:
✅ PostgreSQL chạy trong cluster (StatefulSet)
✅ Dùng PersistentVolume local
✅ Không cần external database
✅ Dễ reset và test lại

---

## 🚀 PRODUCTION DEPLOYMENT (DEVTRON)

### Use Case:
- Production environment
- Devtron Kubernetes
- Sử dụng RDS PostgreSQL có sẵn

### Quick Start:

```bash
# Trên Devtron Dashboard:

1. Tạo Application mới
   - Name: quychung
   - Git Repo: https://github.com/your-username/quychung-blockchain
   - Deployment Path: k8s/production/  ⭐

2. Configure Secrets
   - Vào Secrets → Create new
   - Thêm: treasury-private-key, db-password, jwt-secret, google-client-id, google-client-secret

3. Update ConfigMap
   - Sửa k8s/production/configmap.yaml
   - Thay RDS endpoint: db-host: "your-rds.rds.amazonaws.com"

4. Update Ingress
   - Sửa k8s/production/ingress.yaml
   - Thay domain: your-domain.com

5. Click Deploy
```

### Đặc điểm:
✅ Sử dụng RDS PostgreSQL (managed)
✅ High availability
✅ Auto-scaling (2-10 replicas)
✅ TLS/HTTPS với domain thật
✅ Production resources

---

## 🔐 Secrets Management

### Local:
```bash
# Tạo từ command line
kubectl create secret generic blockchain-secrets \
  --namespace=quychung \
  --from-literal=treasury-private-key=<value> \
  --from-literal=db-password=<value> \
  --from-literal=jwt-secret=<value> \
  --from-literal=google-client-id=<value> \
  --from-literal=google-client-secret=<value>
```

### Production (Devtron):
- Vào Devtron UI
- Secrets → Create new secret
- Type: Opaque
- Thêm key-value pairs từ file `SECRETS_FOR_DEVTRON.txt`

---

## 📝 Checklist trước khi deploy

### Local:
- [ ] Đã cài kubectl và có cluster (minikube/kind/k3s)
- [ ] Đã build Docker image local
- [ ] Đã tạo secrets
- [ ] Đã apply namespace.yaml

### Production:
- [ ] Đã có RDS PostgreSQL endpoint
- [ ] Đã config RDS security group cho K8s nodes
- [ ] Đã tạo secrets trên Devtron
- [ ] Đã sửa db-host trong configmap.yaml
- [ ] Đã sửa domain trong ingress.yaml
- [ ] Đã push Docker image lên registry

---

## 🚨 Lưu ý quan trọng

### ⚠️ KHÔNG làm:
- ❌ KHÔNG deploy `k8s/local/` lên production
- ❌ KHÔNG deploy `postgres-statefulset.yaml` lên Devtron
- ❌ KHÔNG commit file secrets lên Git
- ❌ KHÔNG dùng StatefulSet PostgreSQL cho production

### ✅ NÊN làm:
- ✅ Dùng `k8s/local/` cho development
- ✅ Dùng `k8s/production/` cho Devtron
- ✅ Backup RDS database thường xuyên
- ✅ Monitor logs và metrics
- ✅ Test kỹ trên local trước khi deploy production

---

## 📚 Đọc thêm

- [Local Deployment Guide](local/README.md)
- [Production Deployment Guide](production/README.md)
- [Build & Deploy Guide](../BUILD_AND_DEPLOY.md)
- [Secrets Reference](../SECRETS_FOR_DEVTRON.txt)

