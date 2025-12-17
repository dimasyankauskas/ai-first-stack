# 🚀 Complete Dokploy Deployment Guide

**Step-by-step guide to deploy any Next.js + PocketBase project to Dokploy**

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] VPS with Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`)
- [ ] GitHub repository with your code
- [ ] Domain names configured (DNS A records → VPS IP)
- [ ] API keys ready (GEMINI_API_KEY, etc.)

---

## Step 1: Create Project Dockerfiles

### 1.1 Backend: `Dockerfile.pocketbase`

Create in project root:

```dockerfile
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
ARG CACHE_BUST=2025-12-17

FROM golang:1.25.5-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2

RUN apk add --no-cache git ca-certificates file

# Clone and build from examples/base (Required for hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN go build -v -o /pocketbase .

# Runtime stage
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

```dockerfile
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

# Build argument for client-side API URL
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

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

> **Important**: Add `output: 'standalone'` to `next.config.js`:
> ```js
> const nextConfig = { output: 'standalone' };
> ```

---

## Step 2: Create docker-compose.prod.yml

Create in project root with **YOUR DOMAINS**:

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
      - pocketbase_data:/pb/pb_data
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
      # ⚠️ CHANGE THESE TO YOUR DOMAIN
      - "traefik.enable=true"
      - "traefik.http.routers.YOUR_PROJECT-frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.YOUR_PROJECT-frontend.entrypoints=websecure"
      - "traefik.http.routers.YOUR_PROJECT-frontend.tls.certResolver=letsencrypt"
      - "traefik.http.services.YOUR_PROJECT-frontend.loadbalancer.server.port=3000"

volumes:
  pocketbase_data:

networks:
  dokploy-network:
    external: true
```

### Key Configuration Points:

| Setting | What to Change |
|---------|----------------|
| `YOUR_PROJECT-pocketbase` | Unique router name (e.g., `prometheus-pocketbase`) |
| `api.yourdomain.com` | Your backend domain |
| `yourdomain.com` | Your frontend domain |

---

## Step 3: Push to GitHub

```bash
git add -A
git commit -m "Add Dokploy deployment configuration"
git push origin main
```

---

## Step 4: Deploy in Dokploy UI

### 4.1 Access Dokploy
Open `http://your-vps-ip:3000` in browser

### 4.2 Create Project (if new)
1. Click **Projects** in sidebar
2. Click **+ Create Project**
3. Name it (e.g., "PROMETHEUS")

### 4.3 Create Compose Service
1. Click **+ Create Service**
2. Select **Compose**
3. Choose **Docker Compose** type

### 4.4 Configure Source
| Field | Value |
|-------|-------|
| Provider | GitHub |
| Repository | `YourUsername/your-repo` |
| Branch | `main` |
| Compose Path | `./docker-compose.prod.yml` |

Click **Save**

### 4.5 Set Environment Variables
1. Go to **Environment** tab
2. Add all required variables:

```
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<generate: openssl rand -base64 24>
PB_ENCRYPTION_KEY=<generate: openssl rand -base64 32>
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
GEMINI_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here
```

### 4.6 Deploy!
1. Click **Deploy** button
2. Wait for build (3-5 minutes for PocketBase)
3. Monitor **Logs** tab for progress

---

## Step 5: Create Admin Account

After deployment succeeds:

```bash
# SSH to your VPS
ssh user@your-vps-ip

# Find the PocketBase container
docker ps | grep pocketbase

# Create admin user
docker exec -it <container_id> /pb/pocketbase superuser create admin@email.com YourPassword123
```

---

## Step 6: Verify Deployment

| Check | URL |
|-------|-----|
| Backend Admin | `https://api.yourdomain.com/_/` |
| Backend Health | `https://api.yourdomain.com/api/health` |
| Frontend | `https://yourdomain.com` |

---

## 🔧 Troubleshooting

### Build Failed
- Check **Logs** tab for error messages
- Verify Dockerfile syntax
- Check environment variables are set

### 502 Bad Gateway
- Container not running: `docker ps`
- Check Traefik labels match container port
- Wait 10-30 seconds for Traefik to route

### SSL Not Working
- Verify DNS A record points to VPS IP
- Wait for Let's Encrypt certificate (10-30 seconds)
- Check domain in Traefik labels is correct

### Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_POCKETBASE_URL` is correct
- Check it's passed as both build arg AND environment variable
- Redeploy frontend after changing

---

## 📁 File Structure Summary

```
your-project/
├── frontend/
│   ├── Dockerfile          ← Frontend Docker build
│   ├── src/
│   └── package.json
├── pb_hooks/
│   └── *.pb.js             ← PocketBase hooks
├── Dockerfile.pocketbase   ← Backend Docker build
├── docker-compose.prod.yml ← Dokploy deployment config
├── docker-compose.yml      ← Local development
└── .env.example            ← Environment template
```

---

**Last Updated:** 2025-12-17
