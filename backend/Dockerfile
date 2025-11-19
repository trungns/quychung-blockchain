# ============================================
# Stage 1: Build Frontend (React)
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend source
COPY ../frontend/package*.json ./
RUN npm ci --only=production

COPY ../frontend/ ./

# Build React app for production
RUN npm run build

# ============================================
# Stage 2: Build Backend (Go) with embedded frontend
# ============================================
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Copy contracts directory from project root (one level up)
COPY ../contracts ./contracts

# Copy built frontend into backend/cmd/static directory
COPY --from=frontend-builder /frontend/build ./cmd/static

# Tidy dependencies
RUN go mod tidy

# Build the application (Go will embed the static files via //go:embed)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# ============================================
# Stage 3: Runtime (Minimal Alpine)
# ============================================
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from backend-builder (static files are embedded in the binary)
COPY --from=backend-builder /app/main .

# Copy contracts directory (for contract ABI)
COPY --from=backend-builder /app/contracts ./contracts

EXPOSE 8080

CMD ["./main"]
