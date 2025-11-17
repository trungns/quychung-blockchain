# 🚀 Production Deployment cho Devtron (với RDS PostgreSQL)

## 📋 Cấu hình này dành cho:
- ✅ Devtron Kubernetes
- ✅ Sử dụng RDS PostgreSQL có sẵn
- ✅ Production environment

## 📂 Files cần deploy:

```
k8s/
├── namespace.yaml              # Namespace (shared)
├── production/
│   ├── configmap.yaml         # Config với RDS endpoint
│   ├── app-deployment.yaml    # App deployment (no postgres)
│   ├── ingress.yaml           # Ingress với domain thật
│   └── hpa.yaml               # Auto-scaling
```

## 🔧 Bước 1: Cấu hình RDS Connection

Sửa file `production/configmap.yaml`:

```yaml
data:
  db-host: "your-rds-endpoint.rds.amazonaws.com"  # ← Thay bằng RDS endpoint của bạn
  db-port: "5432"
  db-name: "quychung"
  db-user: "quychung"
```

## 🔐 Bước 2: Tạo Secrets trên Devtron

Vào Devtron → Secrets → Create new secret:

```
Key                      | Value (từ SECRETS_FOR_DEVTRON.txt)
------------------------|------------------------------------------
treasury-private-key    | <your-private-key>
db-password             | <your-rds-password>
jwt-secret              | <your-jwt-secret>
google-client-id        | <your-google-client-id>
google-client-secret    | <your-google-client-secret>
```

## 🌐 Bước 3: Cấu hình Domain

Sửa file `production/ingress.yaml`:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com              # ← Thay bằng domain thật
    secretName: quychung-tls
  rules:
  - host: your-domain.com          # ← Thay bằng domain thật
```

## 📦 Bước 4: Deploy trên Devtron

1. Tạo Application mới trên Devtron
2. Git Repository: `https://github.com/your-username/quychung-blockchain`
3. **Deployment Path**: `k8s/production/`  ⭐ (Quan trọng!)
4. Click Deploy

Devtron sẽ tự động apply:
- ✅ namespace.yaml (từ k8s/)
- ✅ All files trong k8s/production/

## ✅ Kiểm tra sau khi deploy

```bash
# Kiểm tra pods
kubectl get pods -n quychung

# Kết quả mong đợi (KHÔNG có postgres):
# NAME                           READY   STATUS    RESTARTS   AGE
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          3m
# quychung-app-xxxxxxxxx-xxxxx   1/1     Running   0          3m

# Kiểm tra kết nối RDS
kubectl logs -n quychung -l app=quychung,component=app | grep -i "database\|postgres"
```

## 🔄 Khác biệt so với Local

| Feature | Local (k8s/local/) | Production (k8s/production/) |
|---------|-------------------|------------------------------|
| PostgreSQL | StatefulSet (in-cluster) | RDS (external) |
| Domain | localhost/port-forward | Real domain with TLS |
| Replicas | 1-2 | 2-10 (auto-scale) |
| Resources | Small | Production-sized |
| Secrets | Git (for demo) | Devtron Secrets Manager |

---

**Lưu ý:** KHÔNG deploy file `postgres-statefulset.yaml` trong production!
