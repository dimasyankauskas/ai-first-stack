# 🚀 Complete Application Development Guide

**Next.js + PocketBase + Dokploy Stack**

**All Lessons Learned | Production-Ready | Battle-Tested**

**✨ Updated for PocketBase v0.34.2 (Latest API)**

---

## 📋 Table of Contents

1. [Stack Overview](#stack-overview)
2. [Project Setup](#project-setup)
3. [Environment Variables](#environment-variables)
4. [Docker Configuration](#docker-configuration)
5. [Local Development](#local-development)
6. [Deployment to Dokploy](#deployment-to-dokploy)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Stack Overview

### Current Versions (All Latest & Compatible)

| Component | Version | Status |
|-----------|---------|--------|
| **Next.js** | 16+ | ✅ Latest |
| **PocketBase** | 0.34.2 | ✅ Latest Stable |
| **Go** | 1.22 | ✅ Built in Docker |
| **Alpine** | 3.21 | ✅ Stable |
| **Node** | 24-alpine | ✅ Latest |

### Architecture: Docker Compose via Dokploy

We deploy services using **Docker Compose** with Traefik labels for routing.

- **Backend:** PocketBase (Go, built from `examples/base` for JS hooks)
- **Frontend:** Next.js (Node, standalone output)
- **Network:** `dokploy-network` (external, created by Dokploy)

---

## 📦 Project Setup

### Expected Directory Structure

```
project-root/
├── frontend/                    # Next.js application
│   ├── src/
│   ├── app/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── Dockerfile              # Multi-stage Next.js build
│
├── pb_hooks/                    # PocketBase JavaScript hooks
│   ├── api.pb.js
│   ├── analysis.pb.js
│   └── ...
│
├── Dockerfile.pocketbase        # PocketBase build (Go 1.22)
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production (Dokploy)
├── .env.example                 # Environment template
└── README.md

```

### Initial Setup

```
# Clone your repo
git clone <your-repo>
cd <project-root>

# Copy environment template
cp .env.example .env

# For local dev, edit .env
# For Dokploy, you'll set these in the Dokploy UI instead
```

---

## 🌍 Environment Variables

### What Gets Baked at Build Time vs Runtime

⚠️ **CRITICAL DISTINCTION:**

| Variable | Type | When Set | Changeable | Example |
|----------|------|----------|-----------|---------|
| `NEXT_PUBLIC_POCKETBASE_URL` | Build-time | At `docker build` | ❌ NO (requires rebuild) | `https://api.yourdomain.com` |
| `NODE_ENV` | Runtime | At container start | ✅ YES (no rebuild) | `production` |
| `ADMIN_EMAIL` | Runtime | At container start | ✅ YES (no rebuild) | `admin@yourdomain.com` |

### Backend Environment Variables

```
# .env (for local dev) or Dokploy UI (for production)

# PocketBase Admin Credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SecurePassword123!

# PocketBase Encryption Key (for data-at-rest)
PB_ENCRYPTION_KEY=your-32-char-random-key-here

# Gemini API Key (if using AI features)
GEMINI_API_KEY=AIzaSy...
```

### Frontend Environment Variables

```
# NEXT_PUBLIC_POCKETBASE_URL - BAKED AT BUILD TIME
# If you change this after deployment, you must rebuild the frontend service.
# Dokploy will automatically rebuild when you update the .env and redeploy.

NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
```

---

## 🐳 Docker Configuration

### 1. Dockerfile.pocketbase (Backend)

Build from `examples/base` to enable **JavaScript hooks** support.

```
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
ARG CACHE_BUST=2025-12-18

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN apk add --no-cache git ca-certificates file

# Clone and Build from examples/base (Required for JSVM/Hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

# CGO_ENABLED=0 is CRITICAL for reliability and cross-platform compatibility
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

Multi-stage build with standalone output for Docker.

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

# ⚠️ CRITICAL: NEXT_PUBLIC_POCKETBASE_URL is set at BUILD TIME
# This value gets compiled into the JavaScript bundle.
# It CANNOT be changed at runtime without rebuilding.
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

## 🚀 Local Development

### Using docker-compose.yml (Local)

```
# Start both services locally
docker compose -f docker-compose.yml up -d

# View logs
docker compose logs -f

# PocketBase Admin Panel: http://localhost:8090/_/
# Frontend: http://localhost:3000

# Stop
docker compose down
```

### Environment for Local Development

Create `.env` file in project root:

```
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
ADMIN_EMAIL=admin@local.com
ADMIN_PASSWORD=testpassword123
PB_ENCRYPTION_KEY=your-32-char-random-key-local
GEMINI_API_KEY=your-api-key-local
```

---

## 🌐 Deployment to Dokploy

### Pre-Deployment Checklist

- [ ] DNS A record points to your VPS (e.g., `yourdomain.com` → VPS IP)
- [ ] VPS has Dokploy installed and running
- [ ] `dokploy-network` exists (Dokploy creates this automatically)
- [ ] You have your domain and subdomain names (e.g., `api.yourdomain.com`, `app.yourdomain.com`)

### Step-by-Step Deployment

**1. Create Dokploy Service**

- Go to Dokploy dashboard
- Click **+ Create Service**
- Select **Docker Compose**

**2. Configure Compose File**

- Paste contents of `docker-compose.prod.yml`
- Or set **Compose Path**: `./docker-compose.prod.yml` (if using Git integration)

**3. Set Environment Variables** ⚠️ **CRITICAL STEP**

In Dokploy, set these environment variables:

```
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!
PB_ENCRYPTION_KEY=<generate-random-32-char-string>
GEMINI_API_KEY=AIzaSy...
```

**Important:** When you change `NEXT_PUBLIC_POCKETBASE_URL` here and redeploy, Dokploy will:
1. Read the new value
2. Pass it as a build arg to `docker-compose.prod.yml`
3. Rebuild the frontend with the new URL baked in
4. Redeploy both services

**4. Deploy**

- Click **Deploy** button
- Monitor logs for build completion
- Both services should reach "healthy" status

**5. Verify Health Checks**

```
# Check PocketBase health
curl https://api.yourdomain.com/api/health
# Should return: {"canBackup":true}

# Check frontend is accessible
curl https://app.yourdomain.com
# Should return HTML (Next.js app)
```

**6. Create PocketBase Admin Account**

Inside Dokploy (or SSH to server):

```
# Find the PocketBase container ID
docker ps | grep pocketbase

# Enter the container shell
docker exec -it <container_id> /bin/sh

# Create admin user (inside Alpine shell)
/pb/pocketbase admin create admin@yourdomain.com "YourPassword123!"

# Exit
exit
```

**7. Access PocketBase Admin Panel**

- Go to `https://api.yourdomain.com/_/`
- Login with the admin credentials you just created
- Create your collections

---

## 🔧 Troubleshooting

### "exec format error" when building

**Cause:** Building on ARM (Mac) but deploying to AMD64 (Linux VPS).

**Fix:** Already in `Dockerfile.pocketbase` — we force `GOOS=linux GOARCH=amd64`. No action needed.

### Frontend shows "undefined" for API URL

**Cause:** `NEXT_PUBLIC_POCKETBASE_URL` was not set at build time.

**Fix:**
- In local dev: Check `.env` has `NEXT_PUBLIC_POCKETBASE_URL`
- In Dokploy: Verify you set it in Dokploy's env vars before deploying

### Frontend still uses old API URL after I changed it

**Cause:** `NEXT_PUBLIC_POCKETBASE_URL` is baked into the bundle at build time.

**Fix:** 
1. Update `NEXT_PUBLIC_POCKETBASE_URL` in Dokploy env
2. **Redeploy the frontend service** (Dokploy will rebuild with new value)
3. Wait for build to complete (~2-3 min)

### "network dokploy-network not found"

**Cause:** The external network doesn't exist.

**Fix:**
- Dokploy automatically creates `dokploy-network` on first project
- If getting this error: `docker network create dokploy-network`

### PocketBase admin creation fails

**Cause:** Not using `/bin/sh` wrapper in Alpine.

**Fix:**
```
docker exec -it <container_id> /bin/sh
# Then inside the shell:
/pb/pocketbase admin create admin@yourdomain.com "Password123!"
```

### PocketBase health check fails (503)

**Cause:** PocketBase still starting up or database corruption.

**Fix:**
- Wait 30+ seconds for startup (health check has 30s start-period)
- Check logs: `docker logs <container_id>`
- If persistent, may need to rebuild container

---

## 📚 Next Steps

- **Set up collections:** Go to PocketBase admin panel (`https://api.yourdomain.com/_/`)
- **Configure hooks:** Add your `.js` files to `pb_hooks/`
- **Deploy frontend code:** Push to your repository; Dokploy auto-deploys

---


