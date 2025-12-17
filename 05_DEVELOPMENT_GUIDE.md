# 🚀 Complete Application Development Guide

**Next.js + PocketBase + Dokploy Stack**

**All Lessons Learned | Production-Ready | Battle-Tested**

**✨ Updated for PocketBase v0.34.2 (Latest API)**

---

## 📋 Table of Contents

1. [Stack Overview](#stack-overview)
2. [Project Setup](#project-setup)
3. [Docker Configuration](#docker-configuration)
4. [JavaScript Hooks (PocketBase v0.34.2)](#javascript-hooks)
5. [Environment Variables](#environment-variables)
6. [Deployment to Dokploy (Split Architecture)](#deployment-to-dokploy)
7. [Troubleshooting](#troubleshooting)
8. [Version Management](#version-management)

---

## 🎯 Stack Overview

### Current Versions (All Latest & Compatible)

| Component | Version | LTS Until | Status |
|-----------|---------|-----------|--------|
| **Next.js** | 16.0.10 | N/A | ✅ Latest |
| **PocketBase** | 0.34.2 | Current | ✅ Latest Stable |
| **Go** | 1.23 | N/A | ✅ Latest |
| **Alpine** | 3.21 | May 2026 | ✅ Stable |

### Architecture: Docker Compose via Dokploy
We deploy services using **Docker Compose** with Traefik labels for routing.

*   **Backend:** PocketBase (Go)
*   **Frontend:** Next.js (Node)
*   **Network:** dokploy-network (external)

---

## 📦 Project Setup

### Directory Structure

```
project/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── pb_hooks/
├── Dockerfile.pocketbase
└── .env.example
```

---

## 🐳 Docker Configuration

### 1. Dockerfile.pocketbase (Backend)
*Used for the Backend Service*

```dockerfile
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
ARG CACHE_BUST=2025-12-17

# Stage 1: Build PocketBase from source
FROM golang:1.24-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN apk add --no-cache git ca-certificates file

# Clone and Build from examples/base (Required for JSVM/Hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

# CGO_ENABLED=0 is CRITICAL for reliability
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN go build -v -o /pocketbase .

# Stage 2: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates wget
COPY --from=builder /pocketbase /pb/pocketbase
RUN chmod +x /pb/pocketbase

RUN mkdir -p /pb/pb_hooks /pb/pb_data
COPY pb_hooks /pb/pb_hooks

WORKDIR /pb
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

### 2. frontend/Dockerfile (Frontend)
*Used for the Frontend Service*

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# CRITICAL: Build Argument for Client-Side Bundle
ARG NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_PUBLIC_POCKETBASE_URL=$NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Standalone Output (Required for Docker)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

---

## 🌐 Deployment to Dokploy (Split Architecture)

**Deploy via Docker Compose with Traefik labels.**

### docker-compose.prod.yml

```yaml
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
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pocketbase.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.pocketbase.entrypoints=websecure"
      - "traefik.http.routers.pocketbase.tls.certResolver=letsencrypt"
      - "traefik.http.services.pocketbase.loadbalancer.server.port=8090"

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
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certResolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

volumes:
  pocketbase-data:

networks:
  dokploy-network:
    external: true
```

### Deployment Steps

1. **Create Compose Service** → Select Docker Compose
2. **Set Compose Path**: `./docker-compose.prod.yml`
3. **Set Environment Variables** in Dokploy UI
4. **Deploy!**

---

## 🔒 Security & Optimization

*   **Communication:** Frontend talks to Backend via PUBLIC URL.
*   **Persistent Data:** Always configure volumes for Backend.
*   **SSL:** Dokploy/Traefik handles SSL automatically via labels.

---

## 🐛 Troubleshooting

### "exec format error"
*   **Cause:** Building on ARM (Mac) vs deploying to AMD (VPS).
*   **Fix:** Our Dockerfile forces `GOOS=linux GOARCH=amd64`.

### Frontend says "undefined" URL
*   **Cause:** `NEXT_PUBLIC_POCKETBASE_URL` not present at BUILD time.
*   **Fix:** Pass as build arg in docker-compose.

### "onBootstrap is not defined"
*   **Cause:** Using default PocketBase binary instead of custom build.
*   **Fix:** Build from `examples/base` directory.

---

**Grade: A+ Split Architecture Strategy**
