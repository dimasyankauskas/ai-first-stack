# 🖥️ Local Development Setup (No Docker Required)

Run the **frontend locally** while using a **remote PocketBase** on your VPS (DEV environment).

> This assumes you have:
> - DEV + PROD Dokploy services configured as in `06_DOKPLOY_DEPLOYMENT.md` / `07_GIT_WORKFLOW.md`.
> - PocketBase v0.34.2 and Next.js 16 as defined in `RULES.md`.

---

## 📊 Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  YOUR LOCAL MACHINE (Windows/Mac)                                       │
│  ┌───────────────────────────────┐                                      │
│  │  Frontend (Next.js)           │                                      │
│  │  npm run dev                  │                                      │
│  │  http://localhost:3000        │───────┐                              │
│  │                               │       │ HTTPS API calls              │
│  │  .env.local:                  │       │                              │
│  │  NEXT_PUBLIC_POCKETBASE_URL = │       │                              │
│  │  https://api.dev.project.com  │       │                              │
│  └───────────────────────────────┘       │                              │
│                                         ▼                              │
│  ======================= INTERNET =======================               │
│                                         │                              │
│  VPS (Dokploy)                          ▼                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  DEV ENVIRONMENT (develop branch)                               │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐              │   │
│  │  │ DEV PocketBase      │  │ DEV Frontend        │              │   │
│  │  │ api.dev.project.com │  │ dev.project.com     │              │   │
│  │  │ Port: 8090          │  │ Port: 3000          │              │   │
│  │  │ [DEV Database]      │  │                     │              │   │
│  │  └─────────────────────┘  └─────────────────────┘              │   │
│  │                                                               │   │
│  ├────────────────────────────────────────────────────────────────┤   │
│  │  PROD ENVIRONMENT (main branch)                                │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐              │   │
│  │  │ PROD PocketBase     │  │ PROD Frontend       │              │   │
│  │  │ api.project.com     │  │ project.com         │              │   │
│  │  │ Port: 8090          │  │ Port: 3000          │              │   │
│  │  │ [PROD Database]     │  │                     │              │   │
│  │  └─────────────────────┘  └─────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Environment summary

| Environment   | Where        | Frontend URL      | Backend URL                | Database    |
|--------------|--------------|-------------------|---------------------------|------------|
| Local Dev    | Your machine | `localhost:3000`  | → uses DEV backend        | none local |
| DEV / QA     | VPS          | `dev.project.com` | `api.dev.project.com`     | DEV data   |
| Production   | VPS          | `project.com`     | `api.project.com`         | PROD data  |

For your Prometheus project, `project.com` ↔ `prometheus.buildfutures.ai`.

---

## 📝 Step 1: Local environment

### 1.1 Create `frontend/.env.local`

Example for your Prometheus DEV backend:

```
# Point to DEV PocketBase on VPS
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai

# Optional: API keys for local testing
GEMINI_API_KEY=your-dev-api-key
OPENROUTER_API_KEY=your-dev-api-key
```

### 1.2 Install dependencies

```
cd frontend
npm install
```

### 1.3 Run frontend locally

```
npm run dev
```

Open `http://localhost:3000` – the frontend now talks to the **DEV** PocketBase on your VPS.

---

## 📝 Step 2: VPS DEV/PROD environments

### 2.1 DNS records

Point these A records to your VPS IP:

```
# DEV environment
api.dev.prometheus.buildfutures.ai → YOUR_VPS_IP
dev.prometheus.buildfutures.ai     → YOUR_VPS_IP

# PROD environment
api.prometheus.buildfutures.ai     → YOUR_VPS_IP
prometheus.buildfutures.ai         → YOUR_VPS_IP
```

### 2.2 DEV Compose service in Dokploy

Create a DEV service (if not already done):

| Setting      | Value                         |
|-------------|-------------------------------|
| Name        | `prometheus-dev`              |
| App Name    | `prometheus-dev`              |
| Type        | Docker Compose                |
| Repository  | same as production            |
| Branch      | `develop`                     |
| Compose Path| `./docker-compose.prod.yml`   |

Domains for this service should match the DNS above:

| Service    | Host                                   | Port | HTTPS |
|------------|----------------------------------------|------|-------|
| pocketbase | `api.dev.prometheus.buildfutures.ai`   | 8090 | ON    |
| frontend   | `dev.prometheus.buildfutures.ai`       | 3000 | ON    |

### 2.3 DEV environment variables (Dokploy)

```
ADMIN_EMAIL=dev-admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=<different-from-prod>
PB_ENCRYPTION_KEY=<different-from-prod>
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
GEMINI_API_KEY=<your-dev-key>
OPENROUTER_API_KEY=<your-dev-key>
```

Deploy the DEV service from Dokploy; it will build from the `develop` branch.

---

## 📝 Step 3: Git branches for DEV vs PROD

If not already configured:

```
# Start from main
git checkout main

# Create develop branch
git checkout -b develop

# Push to GitHub
git push -u origin develop
```

Now:

- `main` → production (Dokploy production service watches `main`).  
- `develop` → DEV/QA (Dokploy DEV service watches `develop`).  

---

## 🔄 Daily development workflow

### Morning: start work

```
# 1. Pull latest DEV branch
git checkout develop
git pull origin develop

# 2. Start local frontend
cd frontend
npm run dev

# 3. Open http://localhost:3000 (uses DEV PocketBase)
```

### During the day: push to DEV VPS

```
# After local testing
git add -A
git commit -m "Add new feature"
git push origin develop

# → Dokploy auto-deploys to DEV
# → Test at https://dev.prometheus.buildfutures.ai
```

### Ready for production (high-level)

Later, follow `07_GIT_WORKFLOW.md`:

```
git checkout main
git merge develop
git push origin main
# → Dokploy auto-deploys to PROD
```

---

## 🔧 Switching local backend

### Local → DEV backend (default)

`frontend/.env.local`:

```
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
```

### Local → PROD backend (only when necessary)

```
NEXT_PUBLIC_POCKETBASE_URL=https://api.prometheus.buildfutures.ai
```

> ⚠️ Be careful with PROD: you are working on real data and users.

---

## 📊 Environment variables reference

### Local development (`frontend/.env.local`)

```
# Required – API URL
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai

# Optional – local API keys
GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

### DEV VPS (Dokploy DEV service)

```
ADMIN_EMAIL=dev-admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=DevPassword123!
PB_ENCRYPTION_KEY=dev-encryption-key-32-bytes
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
GEMINI_API_KEY=your-dev-key
OPENROUTER_API_KEY=your-dev-key
```

### PROD VPS (Dokploy PROD service)

```
ADMIN_EMAIL=admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=<secure-production-password>
PB_ENCRYPTION_KEY=<secure-production-key>
NEXT_PUBLIC_POCKETBASE_URL=https://api.prometheus.buildfutures.ai
GEMINI_API_KEY=your-prod-key
OPENROUTER_API_KEY=your-prod-key
```

---

## ⚠️ Important notes

### Database separation

- DEV database: safe for experiments; can be reset.  
- PROD database: real users; never treat as a playground.

### Schema changes

1. Apply and test schema changes on DEV PocketBase first.  
2. After validation, apply equivalent changes to PROD PocketBase.

### API keys

- Prefer separate keys for DEV vs PROD for better monitoring and cost control.

---

## ✅ Checklists

### Initial setup (one‑time)

- [ ] `develop` branch created and pushed.  
- [ ] DEV DNS records created.  
- [ ] DEV Dokploy service created and wired to `develop`.  
- [ ] DEV environment variables configured.  
- [ ] DEV environment deployed and reachable.  
- [ ] DEV PocketBase admin created.  
- [ ] `frontend/.env.local` created.

### Daily development

- [ ] Pull latest `develop`.  
- [ ] Run `npm run dev` in `frontend`.  
- [ ] Develop and test locally against DEV backend.  
- [ ] Push to `develop` when ready and test on DEV VPS.  
- [ ] Merge to `main` only after QA and checks.  

---

## 🐛 Troubleshooting

### “Network Error” calling API

- Check `NEXT_PUBLIC_POCKETBASE_URL` in `.env.local`.  
- Ensure DEV PocketBase container is healthy on VPS.  
- Inspect browser console and network tab for HTTPS/CORS issues.

### Changes not reflecting

- Clear browser cache / hard reload.  
- Restart `npm run dev`.  
- Check that the correct branch (`develop` vs `main`) is deployed in Dokploy.

### Different data between environments

- Expected: DEV and PROD databases are separate.  
- Remember to replicate required schema changes across both once tested.

---

**Last Updated:** 2025‑12‑18 (aligned with Dokploy, PocketBase v0.34.2, and Git workflow).
