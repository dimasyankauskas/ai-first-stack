# File Templates

> Templates for the **Two‑Service Architecture** (Next.js + PocketBase) deployed via Dokploy and Traefik.

---

## 1. `Dockerfile.pocketbase` (backend)

**Location:** repo root  
**Purpose:** Custom PocketBase build with JavaScript hooks enabled (builds from `examples/base`).

```
# PocketBase Dockerfile - WITH JavaScript hooks support
# Based on official PocketBase build instructions from examples/base.
# JavaScript hooks work via the jsvm plugin, NOT via CGO.

ARG CACHE_BUST=2025-12-20

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder
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

# Build with CGO_ENABLED=0 (pure Go SQLite)
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

> This should remain consistent with `04_DOCKER_BUILD_GUIDE.md`.

---

## 2. `docker-compose.prod.yml` (production)

**Location:** repo root  
**Purpose:** Docker Compose for Dokploy deployment with Traefik routing.

```
version: "3.8"

services:
  pocketbase:
    build:
      context: .
      dockerfile: Dockerfile.pocketbase
    restart: always
    ports:
      - 8090
    volumes:
      - pocketbase-data:/pb/pb_data
    environment:
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - dokploy-network
    labels:
      # Example – replace with your project + domains
      - "traefik.enable=true"
      - "traefik.http.routers.YOUR_PROJECT-pocketbase.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.YOUR_PROJECT-pocketbase.entrypoints=websecure"
      - "traefik.http.routers.YOUR_PROJECT-pocketbase.tls.certResolver=letsencrypt"
      - "traefik.http.services.YOUR_PROJECT-pocketbase.loadbalancer.server.port=8090"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_POCKETBASE_URL: ${NEXT_PUBLIC_POCKETBASE_URL}
    restart: always
    ports:
      - 3000
    environment:
      - NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL}
      - NODE_ENV=production
    depends_on:
      pocketbase:
        condition: service_healthy
    networks:
      - dokploy-network
    labels:
      # Example – replace with your project + domains
      - "traefik.enable=true"
      - "traefik.http.routers.YOUR_PROJECT-frontend.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.YOUR_PROJECT-frontend.entrypoints=websecure"
      - "traefik.http.routers.YOUR_PROJECT-frontend.tls.certResolver=letsencrypt"
      - "traefik.http.services.YOUR_PROJECT-frontend.loadbalancer.server.port=3000"

volumes:
  pocketbase-data:

networks:
  dokploy-network:
    external: true
```

> This pattern matches `06_DOKPLOY_DEPLOYMENT.md` / `05_DEVELOPMENT_GUIDE.md`.

---

## 3. `.env.example`

**Location:** repo root  
**Purpose:** Template for environment variables (to be copied to `.env`, Dokploy env, or `.env.local`).

```
# PocketBase
PB_ENCRYPTION_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Frontend (local default – override in Dokploy for production)
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090

# Optional AI keys (example)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/464f2a35-59da-4d3a-9de3-d6eadf11dc49/FILE_TEMPLATES.md)
[2](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/56636679-4370-4a3f-8750-d408e57a8e18/04_DOCKER_BUILD_GUIDE.md)
[3](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/dd47183b-55f8-484f-96d3-9a1dcfe907b2/06_DOKPLOY_DEPLOYMENT.md)
