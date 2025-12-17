# 🖥️ Local Development Setup (No Docker Required)

**Run frontend locally while using remote PocketBase on VPS**

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  YOUR LOCAL MACHINE (Windows/Mac)                                        │
│  ┌───────────────────────────────┐                                       │
│  │  Frontend (Next.js)           │                                       │
│  │  npm run dev                  │                                       │
│  │  http://localhost:3000        │───────┐                               │
│  │                               │       │                               │
│  │  .env.local file:             │       │ HTTPS API Calls               │
│  │  NEXT_PUBLIC_POCKETBASE_URL=  │       │                               │
│  │  https://api.dev.project.com  │       │                               │
│  └───────────────────────────────┘       │                               │
│                                          ▼                               │
│  ════════════════════════════════════════════════════════════════════   │
│                              INTERNET                                    │
│  ════════════════════════════════════════════════════════════════════   │
│                                          │                               │
│  VPS (Dokploy)                           ▼                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │  DEV ENVIRONMENT (develop branch)                                │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐               │    │
│  │  │ DEV PocketBase      │  │ DEV Frontend        │               │    │
│  │  │ api.dev.project.com │  │ dev.project.com     │               │    │
│  │  │ Port: 8090          │  │ Port: 3000          │               │    │
│  │  │ [DEV Database]      │  │                     │               │    │
│  │  └─────────────────────┘  └─────────────────────┘               │    │
│  │                                                                  │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  PROD ENVIRONMENT (main branch)                                  │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐               │    │
│  │  │ PROD PocketBase     │  │ PROD Frontend       │               │    │
│  │  │ api.project.com     │  │ project.com         │               │    │
│  │  │ Port: 8090          │  │ Port: 3000          │               │    │
│  │  │ [PROD Database]     │  │                     │               │    │
│  │  └─────────────────────┘  └─────────────────────┘               │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Environment Summary

| Environment | Where | Frontend URL | Backend URL | Database |
|-------------|-------|--------------|-------------|----------|
| **Local Dev** | Your machine | localhost:3000 | → Uses DEV backend | None local |
| **DEV/QA** | VPS | dev.project.com | api.dev.project.com | DEV data |
| **Production** | VPS | project.com | api.project.com | PROD data |

---

## 📝 Step 1: Set Up Local Environment

### 1.1 Create Environment File

Create `frontend/.env.local`:

```bash
# Point to DEV PocketBase on VPS
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai

# Optional: API keys for local testing
GEMINI_API_KEY=your-dev-api-key
OPENROUTER_API_KEY=your-dev-api-key
```

### 1.2 Install Dependencies

```bash
cd frontend
npm install
```

### 1.3 Run Frontend Locally

```bash
npm run dev
```

Open `http://localhost:3000` - your frontend now talks to DEV PocketBase!

---

## 📝 Step 2: Set Up VPS Environments

### 2.1 Create DNS Records

Add these A records pointing to your VPS IP:

```
# DEV Environment
api.dev.prometheus.buildfutures.ai → YOUR_VPS_IP
dev.prometheus.buildfutures.ai     → YOUR_VPS_IP

# PROD Environment (you already have these)
api.prometheus.buildfutures.ai     → YOUR_VPS_IP
prometheus.buildfutures.ai         → YOUR_VPS_IP
```

### 2.2 Create DEV Compose Service in Dokploy

1. Go to **Projects** → Your Project
2. Click **+ Create Service** → **Compose**
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `prometheus-dev` |
| App Name | `prometheus-dev` |
| Compose Type | Docker Compose |
| Repository | Same as production |
| **Branch** | `develop` ← Important! |
| Compose Path | `./docker-compose.prod.yml` |

### 2.3 Configure DEV Domains

Add domains for DEV service:

| Service | Host | Port | HTTPS |
|---------|------|------|-------|
| pocketbase | `api.dev.prometheus.buildfutures.ai` | 8090 | ON |
| frontend | `dev.prometheus.buildfutures.ai` | 3000 | ON |

### 2.4 Set DEV Environment Variables

```bash
ADMIN_EMAIL=dev-admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=<different-from-prod>
PB_ENCRYPTION_KEY=<different-from-prod>
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
GEMINI_API_KEY=<your-api-key>
OPENROUTER_API_KEY=<your-api-key>
```

### 2.5 Deploy DEV Environment

Click **Deploy** - DEV environment will be created from `develop` branch.

---

## 📝 Step 3: Create Git Branches

```bash
# Make sure you're on main
git checkout main

# Create develop branch
git checkout -b develop

# Push develop branch to GitHub
git push -u origin develop
```

Now you have:
- `main` → Production
- `develop` → DEV/QA

---

## 🔄 Daily Development Workflow

### Morning: Start Work

```bash
# 1. Pull latest from develop
git checkout develop
git pull origin develop

# 2. Start local frontend
cd frontend
npm run dev

# 3. Open localhost:3000 - connected to DEV PocketBase!
```

### During Day: Make Changes

```bash
# Make your code changes...
# The frontend hot-reloads automatically

# When ready to test on VPS:
git add -A
git commit -m "Add new feature"
git push origin develop

# → Dokploy auto-deploys to DEV environment
# → Test at dev.prometheus.buildfutures.ai
```

### Ready for Production

```bash
# After testing on DEV environment
git checkout main
git merge develop
git push origin main

# → Dokploy auto-deploys to PROD
# → Live at prometheus.buildfutures.ai
```

---

## 🔧 Switching Between Environments

### Local → DEV Backend (default)

`frontend/.env.local`:
```bash
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
```

### Local → PROD Backend (testing only!)

`frontend/.env.local`:
```bash
NEXT_PUBLIC_POCKETBASE_URL=https://api.prometheus.buildfutures.ai
```

> ⚠️ **Warning**: Be careful when pointing to PROD - you're working with real data!

---

## 📊 Environment Variables Reference

### Local Development (.env.local)

```bash
# Required - API URL
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai

# Optional - API keys (if needed locally)
GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

### DEV VPS (Dokploy Environment)

```bash
ADMIN_EMAIL=dev-admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=DevPassword123!
PB_ENCRYPTION_KEY=dev-encryption-key-32-bytes
NEXT_PUBLIC_POCKETBASE_URL=https://api.dev.prometheus.buildfutures.ai
GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

### PROD VPS (Dokploy Environment)

```bash
ADMIN_EMAIL=admin@prometheus.buildfutures.ai
ADMIN_PASSWORD=<secure-production-password>
PB_ENCRYPTION_KEY=<secure-production-key>
NEXT_PUBLIC_POCKETBASE_URL=https://api.prometheus.buildfutures.ai
GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

---

## ⚠️ Important Notes

### Database Separation

- **DEV database**: Test freely, can be reset anytime
- **PROD database**: Real users, never test here

### Schema Changes

1. Make schema changes in DEV PocketBase Admin
2. Test thoroughly
3. Apply same changes to PROD PocketBase Admin after deploy

### API Keys

- Consider using separate API keys for DEV vs PROD
- Easier to track usage and costs

---

## ✅ Checklist

### Initial Setup (One-time)

- [ ] Create `develop` branch on GitHub
- [ ] Create DEV DNS records
- [ ] Create DEV Compose service in Dokploy
- [ ] Set DEV environment variables
- [ ] Deploy DEV environment
- [ ] Create DEV admin account in PocketBase
- [ ] Create `frontend/.env.local` file

### Daily Development

- [ ] Pull latest `develop` branch
- [ ] Run `npm run dev` in frontend
- [ ] Make changes, test locally
- [ ] Push to `develop` when ready
- [ ] Test on DEV VPS environment
- [ ] Merge to `main` when approved

---

## 🐛 Troubleshooting

### "Network Error" when calling API

- Check NEXT_PUBLIC_POCKETBASE_URL in .env.local
- Verify DEV PocketBase is running on VPS
- Check browser console for CORS errors

### Changes not reflecting

- Clear browser cache
- Restart `npm run dev`
- Check correct branch is deployed

### Different data between environments

- This is expected! DEV and PROD have separate databases
- Schema changes need to be applied to both

---

**Last Updated:** 2025-12-17
