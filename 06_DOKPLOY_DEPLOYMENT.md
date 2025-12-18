# 🚀 Complete Dokploy Deployment Guide

Step‑by‑step guide to deploy any **Next.js + PocketBase (v0.34.2)** project to **Dokploy** using Docker Compose.

> This guide must stay consistent with:
> - `04_DOCKER_BUILD_GUIDE.md` (PocketBase build).
> - `05_DEVELOPMENT_GUIDE.md` (stack + compose).
> - `AI_SYSTEM_INSTRUCTIONS.md` (Alpine, `/bin/sh`, hook rules).

---

## 📋 Pre‑Deployment Checklist

Before deploying, ensure:

- [ ] VPS with Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`)
- [ ] GitHub repository with your code
- [ ] Domain names configured (DNS A records → VPS IP)
- [ ] API keys ready (e.g. `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, etc.)

---

## Step 1: Create project Dockerfiles

### 1.1 Backend: `Dockerfile.pocketbase` (root)

```
# PocketBase Dockerfile - WITH JavaScript hooks support
ARG CACHE_BUST=2025-12-17

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder
ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN apk add --no-cache git ca-certificates file

# Clone and build from examples/base (required for hooks/jsvm)
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

> This should match the template in `04_DOCKER_BUILD_GUIDE.md`. [file:48]

### 1.2 Frontend: `frontend/Dockerfile`

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

# Build argument for client-side API URL
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

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

> Important: in `frontend/next.config.js` set:

```
const nextConfig = { output: "standalone" };
module.exports = nextConfig;
```

---

## Step 2: Create `docker-compose.prod.yml`

Create this file in the project root and replace domains and router names with your own.

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
      # ⚠️ CHANGE THESE TO YOUR PROJECT + DOMAIN
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
      # ⚠️ CHANGE THESE TO YOUR PROJECT + DOMAIN
      - "traefik.enable=true"
      - "traefik.http.routers.YOUR_PROJECT-frontend.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.YOUR_PROJECT-frontend.entrypoints=websecure"
      - "traefik.http.routers.YOUR_PROJECT-frontend.tls.certResolver=letsencrypt"
      - "traefik.http.services.YOUR_PROJECT-frontend.loadbalancer.server.port=3000"

volumes:
  pocketbase_data:

networks:
  dokploy-network:
    external: true
```

### Key configuration points

| Setting                     | What to change                                  |
|----------------------------|-------------------------------------------------|
| `YOUR_PROJECT-pocketbase`  | Unique router name (e.g. `prometheus-pocketbase`) |
| `api.yourdomain.com`       | Your backend domain                             |
| `app.yourdomain.com`       | Your frontend domain                            |

This should align with `05_DEVELOPMENT_GUIDE.md` and `01_QUICK_START.md`. [file:49][file:45]

---

## Step 3: Push to GitHub

```
git add -A
git commit -m "Add Dokploy deployment configuration"
git push origin main
```

---

## Step 4: Configure deployment in Dokploy

### 4.1 Access Dokploy

Open `http://your-vps-ip:3000` in the browser and log in.

### 4.2 Create project (if needed)

1. Click **Projects** in the sidebar.  
2. Click **+ Create Project**.  
3. Name it (e.g. `PROMETHEUS`).

### 4.3 Create Compose service

1. Inside the project, click **+ Create Service**.  
2. Select **Compose**.  
3. Choose **Docker Compose** type.

### 4.4 Configure source

| Field        | Value                          |
|-------------|--------------------------------|
| Provider    | GitHub                         |
| Repository  | `YourUsername/your-repo`       |
| Branch      | `main`                         |
| Compose Path| `./docker-compose.prod.yml`    |

Click **Save**.

### 4.5 Set environment variables

In the service, open the **Environment** tab and add at least:

```
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<openssl rand -base64 24>
PB_ENCRYPTION_KEY=<openssl rand -base64 32>

NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com

GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
# Add any other app-specific keys...
```

### 4.6 Deploy

1. Click **Deploy**.  
2. Wait for images to build (PocketBase may take a few minutes).  
3. Watch the **Logs** tab for build and startup messages.

---

## Step 5: Create PocketBase admin account

After containers are healthy:

```
# SSH to your VPS
ssh user@your-vps-ip

# Find the PocketBase container
docker ps | grep pocketbase

# Enter the container and create admin user
docker exec -it <container_id> /bin/sh
/pb/pocketbase admin create admin@yourdomain.com "YourSecurePassword123"
```

> Use `admin create`, not `superuser create`, to match your other docs. [file:45][file:48]

---

## Step 6: Verify deployment

| Check            | URL                                   |
|------------------|----------------------------------------|
| Backend Admin    | `https://api.yourdomain.com/_/`       |
| Backend Health   | `https://api.yourdomain.com/api/health` |
| Frontend         | `https://app.yourdomain.com`          |

If all three work and SSL is valid, your deployment is live.

---

## 🔧 Troubleshooting

### Build failed

- Check the **Logs** tab for error messages.  
- Verify Dockerfile syntax and that `Dockerfile.pocketbase` builds from `examples/base`. [file:48]  
- Ensure all required env vars are set in Dokploy.

### 502 Bad Gateway

- Confirm containers are running: `docker ps`.  
- Check Traefik labels match service ports (8090 for PocketBase, 3000 for frontend).  
- Wait 10–30 seconds after deploy for Traefik to update routes.

### SSL not working

- Confirm DNS A records for `api.yourdomain.com` and `app.yourdomain.com` point to the VPS IP.  
- Wait up to 1–2 minutes for Let’s Encrypt certificates.  
- Verify domains in Traefik labels are correct and match DNS.

### Frontend cannot connect to backend

- Confirm `NEXT_PUBLIC_POCKETBASE_URL` in Dokploy is `https://api.yourdomain.com`.  
- Confirm it is passed both as a build arg and env var in `docker-compose.prod.yml`.  
- Redeploy the frontend service after changing env or build args.

---

## 📁 File structure summary

```
your-project/
├── frontend/
│   ├── Dockerfile              # Frontend Docker build
│   ├── src/
│   └── package.json
├── pb_hooks/
│   └── *.pb.js                 # PocketBase hooks
├── Dockerfile.pocketbase       # Backend Docker build
├── docker-compose.prod.yml     # Dokploy deployment config
├── docker-compose.yml          # Local development (optional)
├── .env.example                # Environment template
└── AI_SYSTEM_INSTRUCTIONS.md   # Global AI/system rules
```

---

**Last Updated:** 2025‑12‑18 (aligned with PocketBase v0.34.2, Go 1.22, Alpine 3.21).