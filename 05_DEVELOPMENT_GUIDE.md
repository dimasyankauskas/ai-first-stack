# 🚀 Complete Application Development Guide

**Stack:** Next.js + PocketBase + Dokploy

**All Lessons Learned | Production-Ready | Battle-Tested**

✨ Updated for **PocketBase v0.34.2** and your AI‑First Stack.

> This guide must be used together with:
> - `AI_SYSTEM_INSTRUCTIONS.md` (global rules, hooks “red zone”). [file:43]
> - `01_QUICK_START.md` (project skeleton).
> - `04_DOCKER_BUILD_GUIDE.md` (PocketBase build). [file:48]

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

### Current versions (keep in sync)

| Component    | Version  | Notes                  |
|-------------|----------|------------------------|
| **Next.js** | 16.x     | App Router, standalone |
| **PocketBase** | 0.34.2 | Current stable         |
| **Go**      | 1.22     | Builder image          |
| **Alpine**  | 3.21     | Runtime base           |

> Always confirm these in `package.json`, `Dockerfile.pocketbase`, and `Dockerfile` when starting a new project. [file:45][file:48]

### Architecture: Docker Compose via Dokploy

We deploy using **Docker Compose** with Traefik labels:

- **Backend:** PocketBase (Go, built from `examples/base` with JS hooks).  
- **Frontend:** Next.js (Node, standalone build).  
- **Network:** `dokploy-network` (external, created/managed by Dokploy).  

---

## 📦 Project Setup

### Directory structure (high level)

```
project/
├── frontend/              # Next.js app
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── pb_hooks/              # PocketBase JS hooks
├── Dockerfile.pocketbase  # Backend Dockerfile
├── docker-compose.yml     # local dev (optional)
├── docker-compose.prod.yml# production (Dokploy)
├── .env.example
└── AI_SYSTEM_INSTRUCTIONS.md
```

Use `01_QUICK_START.md` for detailed “from zero” steps. [file:45]

---

## 🐳 Docker Configuration

### 1. `Dockerfile.pocketbase` (backend)

> This must match the template in `04_DOCKER_BUILD_GUIDE.md`. [file:48]

```
# PocketBase Dockerfile - WITH JavaScript hooks support
ARG CACHE_BUST=2025-12-17

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN apk add --no-cache git ca-certificates file

# Clone and build from examples/base (required for jsvm/hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

# CGO_ENABLED=0 is critical for reliability (pure Go SQLite)
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

### 2. `frontend/Dockerfile` (frontend)

```
FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build argument for client-side bundle
ARG NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_PUBLIC_POCKETBASE_URL=$NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output (required for Docker)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## 🧩 JavaScript Hooks (PocketBase v0.34.2) <a id="javascript-hooks"></a>

> Full API: `02_POCKETBASE_0_3_4_API_REFERENCE.md` and `03_POCKETBASE_QUICK_REFERENCE.md`. [file:46][file:47]

Key rules:

- Always call `e.next()` in `onBootstrap` and `onRecord*` hooks.  
- Always pass a collection filter (e.g. `"posts"`) to `onRecord*` hooks.  
- Use `e.record.collection().name`, not `e.collection.name`.

Example:

```
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
  e.next();
  console.log("[BOOT] PocketBase started");
});

onRecordBeforeCreateRequest((e) => {
  if (e.record.collection().name === "posts") {
    const title = e.record.get("title");
    if (!title || title.length < 5) {
      throw new ValidationError("title", "Title must be at least 5 characters");
    }
  }
  e.next();
}, "posts");
```

---

## 🔐 Environment Variables

Keep environment definitions consistent across `.env.example`, Dokploy, and your docs.

Typical `.env.example`:

```
# PocketBase public URL (production)
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com

# PocketBase admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-password>
PB_ENCRYPTION_KEY=<generated-encryption-key>
```

Generate secure values:

```
openssl rand -base64 24   # password
openssl rand -base64 32   # encryption key
```

In Dokploy:

- Set these under the Compose service’s **Environment** tab.  
- Ensure `NEXT_PUBLIC_POCKETBASE_URL` is set both as an env var and as a build arg in Compose. [file:49]

---

## 🌐 Deployment to Dokploy (Split Architecture)

We deploy both services via **one** `docker-compose.prod.yml` file.

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

Deployment steps (Dokploy):

1. Create **Compose Service** in your project.  
2. Set **Compose Path**: `./docker-compose.prod.yml`.  
3. Configure environment variables.  
4. Deploy and wait for builds + Traefik certificates.

---

## 🐛 Troubleshooting

### `exec /pb/pocketbase: exec format error`

- Usually means architecture mismatch (ARM build on AMD64 VPS).  
- Fix: ensure `GOOS=linux`, `GOARCH=amd64`, and no stray build flags (see `04_DOCKER_BUILD_GUIDE.md`). [file:48]

### Frontend shows `undefined` or wrong API URL

- Cause: `NEXT_PUBLIC_POCKETBASE_URL` missing at **build time**.  
- Fix: pass it as a build arg in Compose and as an env var in the container (as shown above). [file:49]

### `onBootstrap is not defined` or hooks not firing

- Cause: using a binary built from repo root (no `jsvm` plugin).  
- Fix: ensure `Dockerfile.pocketbase` builds from `examples/base` exactly as in the template. [file:48]

---

## 🧬 Version Management

- When you bump:
  - PocketBase version → update `POCKETBASE_VERSION` in `Dockerfile.pocketbase` **and** your docs.  
  - Go / Alpine versions → keep in sync with `04_DOCKER_BUILD_GUIDE.md`.  
  - Domain pattern (`app.yourdomain.com` / `api.yourdomain.com`) → update in:
    - `01_QUICK_START.md`  
    - `05_DEVELOPMENT_GUIDE.md` (this file)  
    - `docker-compose.prod.yml`  
    - `AI_SYSTEM_INSTRUCTIONS.md`  

Keep these in lockstep to avoid subtle AI and deployment inconsistencies.