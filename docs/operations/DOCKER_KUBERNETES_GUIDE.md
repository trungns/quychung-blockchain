# 🐳 HƯỚNG DẪN DOCKER & KUBERNETES CHO NGƯỜI MỚI BẮT ĐẦU

## 📚 PHẦN 1: DOCKER CƠ BẢN

### Docker là gì?

Docker giống như **"hộp đóng gói ứng dụng"**:
- Đóng gói ứng dụng + thư viện + dependencies vào 1 "container"
- Container chạy giống hệt nhau trên mọi máy (Windows, Mac, Linux, Server)

### 3 Khái niệm quan trọng:

```
1. Dockerfile (Công thức)
   ↓ build
2. Image (Khuôn mẫu)
   ↓ run
3. Container (Ứng dụng đang chạy)
```

**Ví dụ thực tế:**
- **Dockerfile** = Công thức nấu phở
- **Image** = Gói phở ăn liền
- **Container** = Tô phở đang ăn

---

## 🏗️ PHẦN 2: CẤU TRÚC DOCKER TRONG DỰ ÁN QUYCHUNG

### Dự án có 3 services (3 containers):

```
quychung/
├── backend/Dockerfile       ← Dockerfile cho Backend (Golang)
├── frontend/Dockerfile      ← Dockerfile cho Frontend (React) 
├── docker-compose.yml       ← Điều phối tất cả containers
└── docker-compose.override.yml ← Override cho testnet
```

---

## 📝 PHẦN 3: GIẢI THÍCH DOCKERFILE BACKEND

File: `backend/Dockerfile`

```dockerfile
# ============ STAGE 1: BUILD (Biên dịch code) ============
FROM golang:1.21-alpine AS builder
# Nghĩa là: Dùng image golang 1.21 làm base, đặt tên là "builder"

WORKDIR /app
# Tạo thư mục /app và cd vào đó

RUN apk add --no-cache git
# Cài git (cần cho go modules)

COPY go.mod ./
# Copy file go.mod vào container

RUN go mod download
# Download dependencies

COPY . .
# Copy toàn bộ source code vào container

RUN go mod tidy
# Đảm bảo dependencies đầy đủ

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go
# Biên dịch code Go thành file binary "main"
# CGO_ENABLED=0: Không dùng C libraries → Binary nhẹ hơn
# GOOS=linux: Build cho Linux


# ============ STAGE 2: RUNTIME (Chạy app) ============
FROM alpine:latest
# Dùng Alpine Linux (chỉ 5MB, rất nhẹ!)

RUN apk --no-cache add ca-certificates
# Cài certificates (cần cho HTTPS)

WORKDIR /root/

COPY --from=builder /app/main .
# Copy file binary "main" từ stage builder

COPY --from=builder /app/contracts ./contracts
# Copy folder contracts (chứa TreasuryLogger.json)

EXPOSE 8080
# Mở port 8080

CMD ["./main"]
# Chạy ứng dụng
```

### Tại sao dùng Multi-stage build?

```
STAGE 1 (builder): 
- Image golang:1.21 = ~300MB
- Có đầy đủ compiler, tools
- Dùng để build

STAGE 2 (runtime):
- Image alpine = ~5MB  
- Chỉ copy binary đã build
- Kết quả: Image cuối chỉ ~20MB (nhẹ gấp 15 lần!)
```

---

## 🔧 PHẦN 4: DOCKER-COMPOSE.YML

File này điều phối tất cả containers:

```yaml
services:
  # ===== PostgreSQL Database =====
  postgres:
    image: postgres:15-alpine     # Dùng image có sẵn
    container_name: quychung-postgres
    environment:                  # Biến môi trường
      POSTGRES_DB: quychung
      POSTGRES_USER: quychung
      POSTGRES_PASSWORD: quychung123
    ports:
      - "5432:5432"              # Map port host:container
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Lưu data persistent
    networks:
      - quychung-network
    healthcheck:                 # Kiểm tra service đã ready chưa
      test: ["CMD-SHELL", "pg_isready -U quychung"]
      interval: 10s

  # ===== Backend (Golang) =====
  backend:
    build:
      context: ./backend         # Build từ folder backend
      dockerfile: Dockerfile     # Dùng Dockerfile ở trên
    container_name: quychung-backend
    environment:
      - DB_HOST=postgres         # Kết nối postgres qua Docker network
      - BLOCKCHAIN_RPC=http://hardhat:8545
      - PORT=8080
    ports:
      - "8080:8080"
    volumes:
      - ./contracts:/root/contracts  # Mount folder contracts
    depends_on:
      postgres:
        condition: service_healthy  # Đợi postgres ready mới start
    networks:
      - quychung-network

  # ===== Frontend (React) =====
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: quychung-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - quychung-network

volumes:
  postgres_data:                # Volume lưu data PostgreSQL

networks:
  quychung-network:             # Network để containers nói chuyện với nhau
    driver: bridge
```

### Giải thích Volumes:

```
┌─────────────────────────────────────────┐
│  Container postgres                     │
│  ┌────────────────────────────────┐    │
│  │ /var/lib/postgresql/data       │    │
│  │ (data trong container)         │    │
│  └────────┬───────────────────────┘    │
│           │ mount                       │
│           ↓                             │
│  ┌────────────────────────────────┐    │
│  │ Volume: postgres_data           │    │
│  │ (lưu ở host machine)           │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘

Khi xóa container → Data vẫn còn trong volume
Khi recreate container → Mount lại volume → Data trở lại
```

---

## 🚀 PHẦN 5: DOCKER-COMPOSE.OVERRIDE.YML

File: `docker-compose.override.yml`

```yaml
services:
  backend:
    environment:
      - BLOCKCHAIN_RPC=https://rpc-amoy.polygon.technology
      - TREASURY_PRIVATE_KEY=0xf608...
    depends_on:
      postgres:
        condition: service_healthy
      # Bỏ hardhat dependency
```

**Tại sao cần file này?**
- `docker-compose.yml` = Cấu hình gốc (dùng Hardhat local)
- `docker-compose.override.yml` = Override để dùng testnet
- Docker tự động merge 2 file này khi chạy `docker-compose up`

---

## 🎯 PHẦN 6: LỆNH DOCKER CƠ BẢN

### Build image:
```bash
# Build tất cả services
docker-compose build

# Build 1 service cụ thể
docker-compose build backend
```

### Start containers:
```bash
# Start tất cả
docker-compose up -d

# Start services cụ thể
docker-compose up -d postgres backend

# Xem logs
docker-compose logs -f backend
```

### Stop containers:
```bash
# Stop
docker-compose stop

# Stop + Remove containers
docker-compose down

# Stop + Remove containers + volumes (XÓA DATA)
docker-compose down -v
```

### Quản lý containers:
```bash
# Xem containers đang chạy
docker ps

# Xem tất cả containers (cả đã stop)
docker ps -a

# Vào trong container
docker exec -it quychung-backend sh

# Xem logs
docker logs quychung-backend
docker logs -f quychung-backend  # Follow logs real-time

# Restart 1 container
docker-compose restart backend
```

### Quản lý images:
```bash
# Xem images
docker images

# Xóa image
docker rmi quychung-backend

# Xóa tất cả images không dùng
docker image prune -a
```

### Quản lý volumes:
```bash
# Xem volumes
docker volume ls

# Xem chi tiết volume
docker volume inspect quychung_postgres_data

# Xóa volume (CẢNH BÁO: Mất data!)
docker volume rm quychung_postgres_data

# Xóa tất cả volumes không dùng
docker volume prune
```

---

## ☸️ PHẦN 7: CHUẨN BỊ CHO KUBERNETES (K8S)

### Kubernetes là gì?

```
Docker       = Chạy containers trên 1 máy
Kubernetes   = Quản lý containers trên NHIỀU máy (cluster)
```

**Ví dụ thực tế:**
- **Docker:** Bạn chạy 1 website trên 1 server
- **Kubernetes:** Website chạy trên 10 servers, tự động cân bằng tải, tự healing khi crash

### Kubernetes vs Docker:

| Docker Compose | Kubernetes |
|----------------|------------|
| docker-compose.yml | deployment.yaml + service.yaml |
| docker-compose up | kubectl apply |
| 1 máy | Nhiều máy (cluster) |
| Không auto-scale | Auto-scale |
| Không self-healing | Self-healing |

---

## 📋 PHẦN 8: CHUẨN BỊ DỰ ÁN CHO DEVTRON/K8S

### Bước 1: Tạo Docker Images cho từng service

Hiện tại bạn build local. Để deploy K8s cần push images lên **Container Registry**.

**Container Registry phổ biến:**
- Docker Hub (free)
- Google Container Registry (GCR)
- AWS ECR
- GitLab Container Registry

**Ví dụ với Docker Hub:**

```bash
# 1. Login Docker Hub
docker login

# 2. Tag images
docker tag quychung-backend your-dockerhub-username/quychung-backend:v1.0
docker tag quychung-frontend your-dockerhub-username/quychung-frontend:v1.0

# 3. Push lên registry
docker push your-dockerhub-username/quychung-backend:v1.0
docker push your-dockerhub-username/quychung-frontend:v1.0
```

### Bước 2: Tạo Kubernetes Manifests

Cần tạo các file YAML cho K8s:

```
k8s/
├── backend-deployment.yaml      # Deploy backend
├── backend-service.yaml         # Expose backend
├── frontend-deployment.yaml     # Deploy frontend
├── frontend-service.yaml        # Expose frontend
├── postgres-statefulset.yaml    # Database với persistent volume
├── postgres-service.yaml        # Expose postgres
├── configmap.yaml              # Config (non-sensitive)
└── secret.yaml                 # Secrets (passwords, keys)
```

### Bước 3: Cấu hình cho Devtron

Devtron là **GUI cho Kubernetes**, giúp deploy dễ dàng hơn.

**Devtron cần:**
1. **Git Repository:** Code của bạn (đã có ✅)
2. **Dockerfile:** Mỗi service (đã có ✅)
3. **Kubernetes Manifests:** Cần tạo thêm
4. **Container Registry:** Docker Hub/GCR (cần setup)

---

## 🔐 PHẦN 9: SECRETS MANAGEMENT

### Hiện tại (Docker Compose):
```yaml
environment:
  - TREASURY_PRIVATE_KEY=0xf608...  # ❌ Hard-code trong file
```

### Trên Kubernetes/Devtron:
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: blockchain-secrets
type: Opaque
data:
  treasury-private-key: <base64-encoded-key>  # ✅ Encrypted

---
# deployment.yaml
env:
  - name: TREASURY_PRIVATE_KEY
    valueFrom:
      secretKeyRef:
        name: blockchain-secrets
        key: treasury-private-key
```

---

## 📊 PHẦN 10: KIẾN TRÚC PRODUCTION

### Hiện tại (Local Docker):
```
┌─────────────────────────────────┐
│   Máy tính của bạn              │
│  ┌──────┐ ┌──────┐ ┌─────────┐ │
│  │Front │ │Back  │ │Postgres │ │
│  └──────┘ └──────┘ └─────────┘ │
└─────────────────────────────────┘
```

### Production (Kubernetes):
```
┌─────────────────────────────────────────────┐
│         KUBERNETES CLUSTER                  │
├─────────────────────────────────────────────┤
│  Node 1          Node 2         Node 3      │
│  ┌──────┐       ┌──────┐       ┌──────┐   │
│  │Front │       │Front │       │Back  │   │
│  │ x2   │       │Back  │       │ x2   │   │
│  └──────┘       └──────┘       └──────┘   │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ PostgreSQL (StatefulSet)            │  │
│  │ Persistent Volume                   │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Load Balancer                       │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↑
    Internet
```

---

## 🎓 PHẦN 11: ROADMAP HỌC TIẾP

Để deploy production, bạn cần học:

### 1. Docker (đã biết cơ bản ✅)
- ✅ Dockerfile
- ✅ docker-compose
- ⏳ Multi-stage builds nâng cao
- ⏳ Optimize image size

### 2. Container Registry
- ⏳ Docker Hub
- ⏳ Push/Pull images
- ⏳ Image tagging strategy

### 3. Kubernetes Basics
- ⏳ Pods, Deployments, Services
- ⏳ ConfigMaps, Secrets
- ⏳ Persistent Volumes
- ⏳ kubectl commands

### 4. Devtron
- ⏳ Setup pipeline CI/CD
- ⏳ Deploy từ Git repository
- ⏳ Monitor applications
- ⏳ Rollback deployments

### 5. Production Concerns
- ⏳ Logging (ELK, Loki)
- ⏳ Monitoring (Prometheus, Grafana)
- ⏳ Backup strategies
- ⏳ Security best practices

---

## 📚 TÀI LIỆU THAM KHẢO

**Docker:**
- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/

**Kubernetes:**
- Kubernetes Basics: https://kubernetes.io/docs/tutorials/kubernetes-basics/
- kubectl Cheat Sheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

**Devtron:**
- Devtron Docs: https://docs.devtron.ai/
- Getting Started: https://docs.devtron.ai/getting-started

**Best Practices:**
- 12 Factor App: https://12factor.net/
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/

---

**Hãy học từng bước, đừng vội vàng! 🚀**
