# File Templates

> **Note:** These templates are optimized for the **Two-Service Architecture** (Next.js + PocketBase) deploying to Dokploy.

---

## 1. `Dockerfile.pocketbase` (Backend)

**Location:** Root directory
**Purpose:** Custom PocketBase build with JavaScript hooks enabled.

```dockerfile
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
# Based on official PocketBase build instructions from examples/base
# JavaScript hooks work via jsvm plugin, NOT via CGO!

ARG CACHE_BUST=2025-12-16

# Stage 1: Build PocketBase from source
FROM golang:1.25.5-alpine AS builder

ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

# Print build info
RUN echo "=== BUILD INFO ===" && \
    echo "Architecture: $(uname -m)" && \
    echo "Cache: ${CACHE_BUST}" && \
    echo "=================="

# Install required tools
RUN apk add --no-cache git ca-certificates file

# Clone PocketBase source
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && \
    git checkout v${POCKETBASE_VERSION}

# Build from examples/base which includes jsvm (JavaScript) support
WORKDIR /app/examples/base

# Build with CGO_ENABLED=0 (Pure Go SQLite)
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN go build -v -o /pocketbase . && \
    echo "=== BINARY INFO ===" && \
    ls -la /pocketbase && \
    file /pocketbase && \
    echo "=================="

# Stage 2: Runtime
FROM alpine:3.21

# Install runtime dependencies
RUN apk add --no-cache ca-certificates wget

# Copy built PocketBase
COPY --from=builder /pocketbase /pb/pocketbase

RUN chmod +x /pb/pocketbase && \
    echo "=== RUNTIME VERIFY ===" && \
    file /pb/pocketbase && \
    echo "======================"

# Create directories
RUN mkdir -p /pb/pb_hooks /pb/pb_data

# Copy hooks
COPY pb_hooks /pb/pb_hooks

WORKDIR /pb
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8090/api/health || exit 1

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

---

## 2. `docker-compose.prod.yml` (Production)

**Location:** Root directory
**Purpose:** Docker Compose for Dokploy deployment with Traefik labels.
> **Note:** For Dokploy, deploy using a Compose service with `dokploy-network` and Traefik labels for routing.


```yaml
services:
  pocketbase:
    build:
      context: .
      dockerfile: Dockerfile.pocketbase
    restart: always
    volumes:
      - pb_data:/pb/pb_data
    environment:
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY}

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_POCKETBASE_URL: ${NEXT_PUBLIC_POCKETBASE_URL}
    restart: always
    environment:
      - NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com

volumes:
  pb_data:
```

---

## 3. `.env.example`

**Location:** Root directory
**Purpose:** Template for environment variables.

```bash
# PocketBase
PB_ENCRYPTION_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Frontend
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```
