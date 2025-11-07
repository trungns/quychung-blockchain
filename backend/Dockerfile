# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod ./

# Initialize go.sum if not exists
RUN go mod download

# Copy source code
COPY . .

# Tidy dependencies to ensure go.sum is complete
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

# Copy contracts directory (for contract ABI)
COPY --from=builder /app/contracts ./contracts

EXPOSE 8080

CMD ["./main"]
