# 🚀 Complete Dokploy Deployment Guide

**Step-by-step guide to deploy Next.js + PocketBase project to Dokploy**

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] VPS with Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`)
- [ ] GitHub repository with your code
- [ ] Domain names configured (DNS A records → VPS IP)
- [ ] SSH access to your VPS
- [ ] API keys ready (GEMINI_API_KEY, etc.)
- [ ] `docker network create dokploy-network` run on VPS (Dokploy does this automatically, but verify)

---

## Step 1: Prepare Project Files

### 1.1 Backend: `Dockerfile.pocketbase`

Create in project root:

```
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
ARG CACHE_BUST=2025-12-20

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN apk add --no-cache git ca-certificates file

# Clone and build from examples/base (Required for JS hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

# CGO_ENABLED=0 is CRITICAL for reliability and cross-platform
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

### 1.2 Frontend: `frontend/Dockerfile`

Create in `frontend/` folder:

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
# This value gets compiled into the JavaScript bundle
# It CANNOT be changed at runtime without rebuilding the frontend
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

### 1.3 Next.js Config

Make sure `next.config.js` has `output: 'standalone'`:

```
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

---

## Step 2: Create docker-compose.prod.yml

Create in project root with **YOUR DOMAINS**:

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
      # ⚠️ CHANGE THESE TO YOUR DOMAIN
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
        # ✅ CRITICAL: NEXT_PUBLIC_POCKETBASE_URL is baked into the Next.js bundle at BUILD TIME
        # Setting it here ensures the URL is compiled into the frontend.
        # Changing this requires a **rebuild/redeploy** of the frontend service.
        NEXT_PUBLIC_POCKETBASE_URL: ${NEXT_PUBLIC_POCKETBASE_URL}
    restart: always
    ports:
      - 3000
    environment:
      # ℹ️ Runtime environment variables ONLY
      # Note: NEXT_PUBLIC_POCKETBASE_URL is NOT included here because it's already baked in via build arg.
      # If you change NEXT_PUBLIC_POCKETBASE_URL in your env file and redeploy, Dokploy will rebuild
      # the frontend with the new value. Do NOT add NEXT_PUBLIC_* vars to this section.
      - NODE_ENV=production
    depends_on:
      pocketbase:
        condition: service_healthy
    networks:
      - dokploy-network
    labels:
      # ⚠️ CHANGE THESE TO YOUR DOMAIN
      - "traefik.enable=true"
      - "traefik.http.routers.YOUR_PROJECT-frontend.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.YOUR_PROJECT-frontend.entrypoints=websecure"
      - "traefik.http.routers.YOUR_PROJECT-frontend.tls.certResolver=letsencrypt"
      - "traefik.http.services.YOUR_PROJECT-frontend.loadbalancer.server.port=3000"

volumes:
  pocketbase-data:

networks:
  dokploy-network:
    # ⚠️ IMPORTANT: This network must exist before deploying.
    # Dokploy automatically creates dokploy-network on first project creation.
    # If deploying manually or getting "network not found" error:
    # Run: docker network create dokploy-network
    external: true
```

### Key Configuration Points:

| Setting | What to Change |
|---------|----------------|
| `YOUR_PROJECT-pocketbase` | Unique router name (e.g., `bruber-pocketbase`) |
| `api.yourdomain.com` | Your backend domain |
| `app.yourdomain.com` | Your frontend domain |

---

## Step 3: Push to GitHub

```
git add -A
git commit -m "Add Dokploy deployment configuration"
git push origin main
```

---

## Step 4: Deploy in Dokploy UI

### 4.0 Pre-Deploy Network Setup (If Manual)

SSH to VPS and verify network exists:

```
# Check if network exists
docker network ls | grep dokploy-network

# If not found, create it (Dokploy will do this, but verify)
docker network create dokploy-network
```

### 4.1 Access Dokploy Dashboard

Open `http://your-vps-ip:3000` in browser (Dokploy default port)

### 4.2 Create Project (if new)

1. Click **Projects** in sidebar
2. Click **+ Create Project**
3. Name it (e.g., "BRUBER")

### 4.3 Create Compose Service

1. Click **+ Create Service**
2. Select **Compose**
3. Choose **Docker Compose** type

### 4.4 Configure Git Source

| Field | Value |
|-------|-------|
| Provider | GitHub |
| Repository | `YourUsername/your-repo` |
| Branch | `main` |
| Compose Path | `./docker-compose.prod.yml` |

Click **Save**

### 4.5 Set Environment Variables

⚠️ **CRITICAL STEP** - Go to **Environment** tab and add all required variables:

```
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<generate: openssl rand -base64 24>
PB_ENCRYPTION_KEY=<generate: openssl rand -base64 32>
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
GEMINI_API_KEY=your-key-here
```

**Important Notes:**

- `NEXT_PUBLIC_POCKETBASE_URL` is baked into the Next.js build at compile time
- Changing this env var requires Dokploy to **rebuild the frontend service**
- When you redeploy after changing this, Dokploy will pass it as a build arg
- The value will be compiled into the frontend JavaScript bundle

### 4.6 Deploy!

1. Click **Deploy** button
2. Wait for build (3-5 minutes for PocketBase + Next.js)
3. Monitor **Logs** tab for progress
4. Both services should show **"healthy"** status when done

---

## Step 5: Create PocketBase Admin Account

After deployment succeeds and containers are healthy:

```
# SSH to your VPS
ssh user@your-vps-ip

# Find the PocketBase container ID
docker ps | grep pocketbase

# Enter the Alpine container shell
docker exec -it <container_id> /bin/sh

# Inside the Alpine shell, create admin user
/pb/pocketbase admin create admin@yourdomain.com "YourSecurePassword123!"

# Exit the shell
exit
```

---

## Step 6: Verify Deployment

### Verify Health Checks

```
# Check PocketBase health
curl https://api.yourdomain.com/api/health
# Should return: {"canBackup":true}

# Check frontend is accessible
curl https://app.yourdomain.com
# Should return HTML (Next.js app)
```

### Access Services

| Service | URL |
|---------|-----|
| PocketBase Admin | `https://api.yourdomain.com/_/` |
| PocketBase Health | `https://api.yourdomain.com/api/health` |
| Frontend App | `https://app.yourdomain.com` |

### Verify Frontend Can Reach Backend

1. Open `https://app.yourdomain.com` in browser
2. Open **Developer Tools** (F12 or Cmd+Option+I)
3. Go to **Network** tab
4. Perform any action in your app that calls the backend
5. Verify requests go to `https://api.yourdomain.com/api/...`
6. Should see 200/201 status codes, not CORS errors

---

## 🔧 Troubleshooting

### Build Failed

```
# SSH to VPS and check logs
docker logs <service_name>

# Look for:
# - Syntax errors in Dockerfile
# - Missing environment variables
# - Git clone failures
```

### 502 Bad Gateway

**Cause:** Traefik can't reach the container.

```
# Check containers are running
docker ps

# Check Traefik labels match container ports
# Verify pocketbase service has port 8090
# Verify frontend service has port 3000
```

**Fix:** Wait 10-30 seconds for Traefik to detect and route to containers.

### SSL Not Working

**Cause:** DNS or Let's Encrypt issue.

```
# Verify DNS A record points to VPS IP
nslookup api.yourdomain.com

# Wait for Let's Encrypt cert (10-30 seconds after deploy)
# Check Traefik dashboard: http://your-vps-ip:8080
```

### Frontend Can't Connect to Backend (Network Errors in Console)

**Cause:** `NEXT_PUBLIC_POCKETBASE_URL` wasn't set correctly at build time.

**Fix:**
1. Verify the env var is set in Dokploy: `NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com`
2. Redeploy the frontend service (Dokploy will rebuild with new URL)
3. Wait for build to complete (~2-3 min)
4. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
5. Reload page

### PocketBase Admin Creation Fails

**Cause:** Not using `/bin/sh` wrapper in Alpine.

**Fix:**
```
# Correct way:
docker exec -it <container_id> /bin/sh
# Then inside the shell:
/pb/pocketbase admin create admin@yourdomain.com "Password123!"

# Wrong way (will fail):
docker exec -it <container_id> /pb/pocketbase admin create ...
```

### PocketBase Health Check Fails (503)

**Cause:** PocketBase still starting up or database issue.

**Fix:**
- Wait 30+ seconds after deployment (health check has 30s start-period)
- Check logs: `docker logs <pocketbase_container_id>`
- If persistent, may need to clear data and redeploy

### "network dokploy-network not found"

**Cause:** External network doesn't exist.

**Fix:**
```
# Create the network
docker network create dokploy-network

# Redeploy service in Dokploy UI
```

---

## 📁 File Structure Summary

```
your-project/
├── frontend/
│   ├── Dockerfile              ← Frontend Docker build
│   ├── next.config.js          ← Must have output: 'standalone'
│   ├── src/
│   ├── app/
│   ├── package.json
│   └── tsconfig.json
├── pb_hooks/
│   ├── api.pb.js               ← PocketBase API hooks
│   ├── analysis.pb.js          ← Custom analysis hooks
│   └── ...
├── Dockerfile.pocketbase       ← Backend Docker build (Go 1.22)
├── docker-compose.yml          ← Local development
├── docker-compose.prod.yml     ← Production deployment (this file)
├── .env.example                ← Environment template
├── .github/
│   └── workflows/              ← Optional: CI/CD pipelines
└── README.md
```

---

## 🚀 Next Steps

1. ✅ **Deploy:** Click Deploy button in Dokploy
2. ✅ **Verify:** Check health checks and access URLs
3. ✅ **Create Admin:** Set up PocketBase admin account
4. ✅ **Create Collections:** Go to PocketBase admin and create your data schema
5. ✅ **Deploy Frontend Code:** Push code; Dokploy auto-rebuilds on git push

---

**Last Updated:** 2025-12-18  
**Status:** Production-Ready ✅
