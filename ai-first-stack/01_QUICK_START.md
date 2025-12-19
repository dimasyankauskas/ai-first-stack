# 🚀 New Project Starter Template

Step‑by‑step guide to start a **production‑ready** Next.js + PocketBase + Dokploy project.

**Time to complete:** ~30 minutes

> This Quick Start assumes you are also using `AI_SYSTEM_INSTRUCTIONS.md` in the repo root (Next.js 16 + PocketBase v0.34.2 + Dokploy, Alpine `/bin/sh`, and strict PocketBase hook rules). [file:43]

---

## 📋 What You'll Build

A complete **Docker Compose project** with:

- ✅ Next.js 16 frontend (React 19, TypeScript) — **separate service**
- ✅ PocketBase v0.34.2 backend (JavaScript hooks) — **separate service**
- ✅ Ready for Dokploy deployment (Docker Compose with Traefik)
- ✅ Version‑pinned, production‑shaped stack

> **Architecture:** One Git repo → One `docker-compose.prod.yml` → Dokploy Compose Service. See `README.md` for the architecture diagram. [file:45]

---

## 🎯 Step 1: Create Project Structure

### 1.1 Create Project Directory

Adapt the path to your own machine:

```
cd "d:/AI/MY Projects"   # or your projects folder

# Create new project
mkdir my-new-project
cd my-new-project

# Initialize Git
git init
```

### 1.2 Create Directory Structure

```
# Create core directories
mkdir frontend
mkdir pb_hooks
mkdir docs

# Your structure should be:
# my-new-project/
# ├── frontend/              (Next.js app)
# ├── pb_hooks/              (PocketBase JavaScript hooks)
# ├── docs/                  (Documentation)
# ├── Dockerfile.pocketbase  (Backend Dockerfile)
# ├── docker-compose.yml     (local dev)
# ├── docker-compose.prod.yml (production)
# ├── .env.example
# └── AI_SYSTEM_INSTRUCTIONS.md
```

Copy `AI_SYSTEM_INSTRUCTIONS.md` and any shared docs from your `ai-first-stack` / `templates` project into `docs/` now if you want them in this repo. [file:43][file:45]

---

## 🎯 Step 2: Create Frontend (Next.js)

### 2.1 Initialize Next.js

```
cd frontend

npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

# Install dependencies
npm install pocketbase zustand lucide-react
```

### 2.2 Create `frontend/Dockerfile`

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

# Non-root user
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

### 2.3 Update `frontend/next.config.js`

```
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // required for Docker
};

module.exports = nextConfig;
```

---

## 🎯 Step 3: Create PocketBase Setup

### 3.1 Create `Dockerfile.pocketbase`

> ⚠️ Use this exact pattern; it is compatible with PocketBase v0.34.2 hooks and your Alpine runtime. [file:45]

```
# PocketBase Dockerfile - WITH JavaScript hooks support

ARG CACHE_BUST=2025-12-17

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder

ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

RUN echo "=== BUILD INFO ===" && \
    echo "Architecture: $(uname -m)" && \
    echo "Cache: ${CACHE_BUST}" && \
    echo "=================="

RUN apk add --no-cache git ca-certificates file

RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && \
    git checkout v${POCKETBASE_VERSION}

WORKDIR /app/examples/base

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

RUN apk add --no-cache ca-certificates wget

COPY --from=builder /pocketbase /pb/pocketbase

RUN chmod +x /pb/pocketbase && \
    echo "=== RUNTIME VERIFY ===" && \
    file /pb/pocketbase && \
    echo "======================"

RUN mkdir -p /pb/pb_hooks /pb/pb_data

COPY pb_hooks /pb/pb_hooks

WORKDIR /pb
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

> Remember: all hooks must follow your global rules (`e.next()` first in `onBootstrap`, collection filters on `onRecord*`, `e.record.collection().name`), as described in `AI_SYSTEM_INSTRUCTIONS.md`. [file:43][file:45]

### 3.2 Example: `pb_hooks/schema_enforcer.pb.js`

(Keep this as an example; adapt to each project’s schema.)

```
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
  e.next(); // MUST be first

  console.log("[SCHEMA] Starting validation...");

  const users = $app.findCollectionByNameOrId("users");
  const usersId = users.id;

  const createField = (f) => {
    const opts = { name: f.name, required: f.required, ...f.options };
    switch (f.type) {
      case "text": return new TextField(opts);
      case "relation": return new RelationField(opts);
      case "select": return new SelectField(opts);
      case "bool": return new BoolField(opts);
      case "number": return new NumberField(opts);
      default: throw new Error("Unknown type: " + f.type);
    }
  };

  const ensureCollection = (config) => {
    let collection;
    try {
      collection = $app.findCollectionByNameOrId(config.name);
    } catch (_) {
      collection = new Collection();
      collection.name = config.name;
      collection.type = config.type || "base";
    }

    collection.listRule = config.listRule;
    collection.viewRule = config.viewRule;
    collection.createRule = config.createRule;
    collection.updateRule = config.updateRule;
    collection.deleteRule = config.deleteRule;

    if (config.schema) {
      const existing = collection.fields.clone();
      for (const f of existing) {
        if (!f.system) collection.fields.removeById(f.id);
      }
      config.schema.forEach((fieldConfig) => {
        collection.fields.add(createField(fieldConfig));
      });
    }

    $app.save(collection);
    console.log(`[SCHEMA] ✓ ${config.name}`);
    return collection;
  };

  const posts = ensureCollection({
    name: "posts",
    type: "base",
    schema: [
      { name: "title", type: "text", required: true, options: { max: 200 } },
      { name: "content", type: "text", options: {} },
      {
        name: "author",
        type: "relation",
        required: true,
        options: {
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
      },
    ],
    listRule: "@request.auth.id != \"\"",
    viewRule: "@request.auth.id != \"\"",
    createRule: "@request.auth.id != \"\"",
    updateRule: "@request.auth.id = author",
    deleteRule: "@request.auth.id = author",
  });

  console.log("[SCHEMA] Complete!");
});
```

---

## 🎯 Step 4: Local Development with Docker Compose

### 4.1 `docker-compose.yml` (local dev)

```
version: "3.8"

services:
  pocketbase:
    build:
      context: .
      dockerfile: Dockerfile.pocketbase
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb/pb_data
      - ./pb_hooks:/pb/pb_hooks
    environment:
      - ADMIN_EMAIL=admin@localhost.com
      - ADMIN_PASSWORD=admin123
    networks:
      - app_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_POCKETBASE_URL: http://localhost:8090
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
    depends_on:
      - pocketbase
    networks:
      - app_network

networks:
  app_network:
```

Run local dev:

```
docker compose up --build
# Frontend: http://localhost:3000
# PocketBase Admin: http://localhost:8090/_/
```

---

## 🎯 Step 5: Environment Variables

### 5.1 `.env.example` (root)

```
# Backend public URL (production)
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com

# PocketBase admin (production)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<generate-secure-password>
PB_ENCRYPTION_KEY=<generate-encryption-key>
```

### 5.2 Generate secure values

```
# Admin password (24 chars)
openssl rand -base64 24

# Encryption key (32 bytes)
openssl rand -base64 32
```

### 5.3 `.gitignore` (root)

```
# Dependencies
node_modules/
*/node_modules/

# Next.js build
/frontend/.next/

# PocketBase data
/pb_data/

# Environment
.env
```

---

## 🎯 Step 6: Copy Documentation (Optional)

If you maintain a shared `ai-first-stack` / `templates` repo:

```
# Example: copy shared docs into this project
# cp "../ai-first-stack/01_QUICK_START.md" ./docs/
# cp "../ai-first-stack/AI_SYSTEM_INSTRUCTIONS.md" ./AI_SYSTEM_INSTRUCTIONS.md
```

---

## 🎯 Step 7: Initialize Git Remote

```
git add .
git commit -m "Initial project setup"

# Example GitHub flow (requires GitHub CLI)
gh repo create my-new-project --private --source=. --remote=origin
git push -u origin main
```

---

## 🎯 Step 8: Prepare Production `docker-compose.prod.yml`

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
  pocketbase_data:

networks:
  dokploy-network:
    external: true
```

> If your main template uses a different domain pattern (e.g., root domain instead of `app.`), adjust domains here and in `AI_SYSTEM_INSTRUCTIONS.md` to match. [file:42][file:43]

---

## 🎯 Step 9: Create Dokploy Compose Service

1. In Dokploy, open your **Project**.  
2. **Create Service → Compose**.  
3. Configure:
   - Provider: GitHub / Git
   - Repository: your repo
   - Branch: `main`
   - Compose Path: `./docker-compose.prod.yml`

### Set Environment Variables (in Dokploy)

- `ADMIN_EMAIL` = your admin email  
- `ADMIN_PASSWORD` = secure password  
- `PB_ENCRYPTION_KEY` = encryption key  
- `NEXT_PUBLIC_POCKETBASE_URL` = `https://api.yourdomain.com`

Deploy from Dokploy and wait for the build and Traefik certificates.

---

## 🎯 Step 10: Create PocketBase Admin

```
# SSH to your VPS
ssh user@yourvps

# Find PocketBase container
docker ps | grep pocketbase

# Create admin (PocketBase v0.34.2 CLI)
docker exec -it <container_id> /bin/sh
/pb/pocketbase admin create admin@yourdomain.com "your-secure-password"
```

---

## ✅ Final Checklist

- [ ] Local dev works (`docker compose up`)  
- [ ] PocketBase admin reachable at `http://localhost:8090/_/`  
- [ ] Dokploy Compose service created with `docker-compose.prod.yml`  
- [ ] Environment variables set in Dokploy  
- [ ] `https://api.yourdomain.com` and `https://app.yourdomain.com` both work  
- [ ] Admin account created and login verified  

```