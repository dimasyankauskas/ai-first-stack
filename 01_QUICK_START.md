# 🚀 New Project Starter Template

**Step-by-Step Guide to Start a Production-Ready Next.js + PocketBase + Dokploy Project**

**Time to Complete:** ~30 minutes

---

## 📋 **What You'll Build**

A complete **Docker Compose project** with:
- ✅ Next.js 16 frontend (React 19, TypeScript) — **separate service**
- ✅ PocketBase v0.34.2 backend (JavaScript hooks) — **separate service**
- ✅ Ready for Dokploy deployment (Docker Compose with Traefik)
- ✅ All latest versions

> **Architecture:** One Git repo → One docker-compose.yml → Dokploy Compose Service
> See `README.md` for full architecture diagram.

---


## 🎯 **Step 1: Create Project Structure**

### 1.1 Create Project Directory

```bash
# Navigate to your projects folder
cd "d:\AI\MY Projects"

# Create new project
mkdir my-new-project
cd my-new-project

# Initialize Git
git init
```

### 1.2 Create Directory Structure

```bash
# Create all directories
mkdir frontend
mkdir pb_hooks
mkdir docs

# Your structure should be:
# my-new-project/
# ├── frontend/          (Next.js app)
# ├── pb_hooks/          (PocketBase JavaScript hooks)
# ├── docs/              (Documentation)
# ├── Dockerfile.pocketbase (Backend Dockerfile)
# ├── docker-compose.yml (local dev)
# ├── docker-compose.prod.yml (production)
# └── .env.example
```

---

## 🎯 **Step 2: Create Frontend (Next.js)**

### 2.1 Initialize Next.js

```bash
# In project root
cd frontend

# Create Next.js app with all options
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install PocketBase SDK and dependencies
npm install pocketbase
npm install zustand  # State management
npm install lucide-react  # Icons
```

### 2.2 Create Frontend Dockerfile

**Create `frontend/Dockerfile`:**

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

### 2.3 Update next.config.js

**Edit `frontend/next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Required for Docker
};

module.exports = nextConfig;
```

---

## 🎯 **Step 3: Create PocketBase Setup**

### 3.1 Create Dockerfile.pocketbase

**Create `Dockerfile.pocketbase` in project root:**

> ⚠️ **Use this exact template!** It is the OFFICIAL way to build with hooks.

```dockerfile
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
# Based on official PocketBase build instructions from examples/base
ARG CACHE_BUST=2025-12-17

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

# Clone PocketBase/Build from examples/base (Required for JSVM/Hooks)
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && \
    git checkout v${POCKETBASE_VERSION}

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

### 3.2 Create Schema Enforcer Hook

**Create `pb_hooks/schema_enforcer.pb.js`:**

```javascript
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
    e.next();  // Run after bootstrap
    
    console.log("[SCHEMA] Starting validation...");
    
    // Get users collection
    const users = $app.findCollectionByNameOrId("users");
    const usersId = users.id;
    
    // Helper function for typed fields (v0.34.2+)
    const createField = (f) => {
        const opts = { name: f.name, required: f.required, ...f.options };
        switch(f.type) {
            case "text": return new TextField(opts);
            case "relation": return new RelationField(opts);
            case "select": return new SelectField(opts);
            case "bool": return new BoolField(opts);
            case "number": return new NumberField(opts);
            default: throw new Error("Unknown type: " + f.type);
        }
    };
    
    // Helper function
    const ensureCollection = (config) => {
        let collection;
        try {
            collection = $app.findCollectionByNameOrId(config.name);
        } catch (e) {
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
            config.schema.forEach(fieldConfig => {
                collection.fields.add(createField(fieldConfig));
            });
        }
        
        $app.save(collection);
        console.log(`[SCHEMA] ✓ ${config.name}`);
        return collection;
    };
    
    // Define YOUR collections here
    const posts = ensureCollection({
        name: "posts",
        type: "base",
        schema: [
            { name: "title", type: "text", required: true, options: { max: 200 } },
            { name: "content", type: "text", options: {} },
            { name: "author", type: "relation", required: true, options: { 
                collectionId: usersId, 
                maxSelect: 1,
                cascadeDelete: false
            }}
        ],
        listRule: "@request.auth.id != \"\"",
        viewRule: "@request.auth.id != \"\"",
        createRule: "@request.auth.id != \"\"",
        updateRule: "@request.auth.id = author",
        deleteRule: "@request.auth.id = author"
    });
    
    console.log("[SCHEMA] Complete!");
});
```

---

## 🎯 **Step 4: Create Docker Compose (Local Dev)**

### 4.1 Local Development (docker-compose.yml)

**Create `docker-compose.yml`:**

```yaml
version: '3.8'

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

---

## 🎯 **Step 5: Environment Variables**

### 5.1 Create .env.example

```bash
# Backend Domain
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourdomain.com

# Admin Credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<generate-secure-password>
PB_ENCRYPTION_KEY=<generate-encryption-key>
```

### 5.2 Generate Secure Credentials

```bash
# Admin password (24 chars)
openssl rand -base64 24

# Encryption key (32 bytes)
openssl rand -base64 32
```

### 5.3 Create .gitignore

```
# Dependencies
node_modules/
*/node_modules/
/frontend/.next/
/pb_data/
.env
```

---

## 🎯 **Step 6: Copy Documentation**

```bash
# Copy essential docs from separate project (optional)
# cp "../PROMETHEUS/docs/..." docs/
```

---

## 🎯 **Step 7: Initialize Git**

```bash
# In project root
git add .
git commit -m "Initial project setup"

# Create GitHub repo and push
gh repo create my-new-project --private --source=. --remote=origin
git push -u origin main
```

---

## 🎯 **Step 8: Deploy to Dokploy (Docker Compose)**

### 8.1 Create Production docker-compose.prod.yml

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

### 8.2 Create Compose Service in Dokploy

1. Go to your **Project** in Dokploy
2. Click **+ Create Service** → **Compose**
3. Select **Docker Compose** type
4. Configure:
   - **Provider**: GitHub or Git
   - **Repository**: Your repo
   - **Branch**: `main`
   - **Compose Path**: `./docker-compose.prod.yml`

### 8.3 Set Environment Variables

1. Go to **Environment** tab
2. Add:
   - `ADMIN_EMAIL` = your email
   - `ADMIN_PASSWORD` = secure password
   - `PB_ENCRYPTION_KEY` = encryption key
   - `NEXT_PUBLIC_POCKETBASE_URL` = `https://api.yourdomain.com`

### 8.4 Deploy!

1. Click **Deploy**
2. Wait for build (~2-3 minutes)
3. Wait ~10 seconds for Traefik to generate SSL certificates

### 8.5 Create Admin Account

```bash
# SSH to your VPS
ssh user@yourvps

# Find container
docker ps | grep pocketbase

# Create admin
docker exec -it <container_id> /pb/pocketbase superuser create admin@yourdomain.com password123
```

### 8.6 Verify Deployment

1. **Backend:** Visit `https://api.yourdomain.com/_/` → Admin Login
2. **Frontend:** Visit `https://app.yourdomain.com` → Check console for errors

---

## 🎯 **Step 9: Completion**

**You have successfully deployed a Next.js + PocketBase app on Dokploy!** 🚀

### Checklist
- [ ] Local Dev works (`docker compose up`)
- [ ] Compose service created in Dokploy
- [ ] Environment variables set
- [ ] Both HTTPS domains working
- [ ] Admin account created
