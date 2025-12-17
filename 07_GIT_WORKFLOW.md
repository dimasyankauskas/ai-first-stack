# 🔄 Git Workflow & Multi-Environment Deployment

**Best practices for Local → QA → Production deployment pipeline**

---

## 📊 Environment Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LOCAL (Your Machine)                                            │
│  └── docker-compose up                                           │
│      └── localhost:3000 (frontend)                               │
│      └── localhost:8090 (backend)                                │
│                                                                  │
│           ↓ git push origin develop                              │
│                                                                  │
│  QA/STAGING (VPS - Dokploy)                                      │
│  └── Watches: "develop" branch                                   │
│      └── qa.yourproject.com                                      │
│      └── api.qa.yourproject.com                                  │
│                                                                  │
│           ↓ git merge develop → main                             │
│                                                                  │
│  PRODUCTION (VPS - Dokploy)                                      │
│  └── Watches: "main" branch                                      │
│      └── yourproject.com                                         │
│      └── api.yourproject.com                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌿 Git Branching Strategy

### Branches

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Production |
| `develop` | Integration/QA testing | QA/Staging |
| `feature/*` | New features | Local only |
| `fix/*` | Bug fixes | Local only |

### Branch Rules

- **Never push directly to `main`** (except initial setup)
- All changes go through `develop` first
- Only merge to `main` when QA passes

---

## 🛠️ Dokploy Setup (Two Services)

### 1. QA/Staging Service

| Setting | Value |
|---------|-------|
| Name | `yourproject-qa` |
| Branch | `develop` |
| Compose Path | `./docker-compose.prod.yml` |
| Frontend Domain | `qa.yourproject.com` |
| Backend Domain | `api.qa.yourproject.com` |

### 2. Production Service

| Setting | Value |
|---------|-------|
| Name | `yourproject-prod` |
| Branch | `main` |
| Compose Path | `./docker-compose.prod.yml` |
| Frontend Domain | `yourproject.com` |
| Backend Domain | `api.yourproject.com` |

> **Tip**: Use separate environment variables for each service (different DB, API keys for testing, etc.)

---

## 📝 Daily Development Workflow

### Starting New Work

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Work locally
docker-compose up
# Make changes, test at localhost:3000
```

### Pushing to QA

```bash
# 1. Commit your changes
git add -A
git commit -m "Add user authentication"

# 2. Merge to develop
git checkout develop
git merge feature/user-authentication
git push origin develop

# → Dokploy auto-deploys to QA
# → Test at qa.yourproject.com
```

### Promoting to Production

```bash
# 1. After QA testing passes
git checkout main
git merge develop
git push origin main

# → Dokploy auto-deploys to Production
# → Live at yourproject.com
```

---

## 🔄 Quick Reference

### Daily Commands

```bash
# Start work
git checkout develop && git pull

# Push to QA
git push origin develop

# Deploy to Production
git checkout main && git merge develop && git push origin main
```

### Emergency Hotfix

```bash
# Fix directly from main (emergency only!)
git checkout main
git checkout -b fix/critical-bug
# ... make fix ...
git checkout main
git merge fix/critical-bug
git push origin main

# Backport to develop
git checkout develop
git merge main
git push origin develop
```

---

## ⚠️ Important Rules

1. **Test locally first** - Always run `docker-compose up` before pushing
2. **QA before Production** - Never skip QA testing
3. **Don't push to main directly** - Always merge from develop
4. **Separate databases** - QA and Production should have different data
5. **Environment variables** - Keep Production secrets separate from QA

---

## 📁 Environment Variables Per Environment

### QA (.env.qa or Dokploy QA Service)
```bash
NEXT_PUBLIC_POCKETBASE_URL=https://api.qa.yourproject.com
ADMIN_EMAIL=qa-admin@yourproject.com
# Use test API keys here
```

### Production (.env.prod or Dokploy Prod Service)
```bash
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourproject.com
ADMIN_EMAIL=admin@yourproject.com
# Use real API keys here
```

---

## ✅ Checklist Before Production Deploy

- [ ] Feature tested locally
- [ ] Pushed to develop and deployed to QA
- [ ] Tested on QA environment
- [ ] No console errors
- [ ] Database migrations tested
- [ ] Team approval (if applicable)
- [ ] Merge develop → main
- [ ] Verify production after deploy

---

**Last Updated:** 2025-12-17
