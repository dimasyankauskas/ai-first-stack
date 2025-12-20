# 🔄 Git Workflow & Multi‑Environment Deployment

Best practices for **Local → QA → Production** using Dokploy and `docker-compose.prod.yml`.

> This workflow assumes:
> - Dokploy has two Compose services (QA + Prod) pointing at the same repo and `docker-compose.prod.yml`.

---

## 📊 Environment overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LOCAL (Your Machine)                                           │
│  └── docker compose up                                          │
│      ├── localhost:3000 (frontend)                              │
│      └── localhost:8090 (backend)                               │
│                                                                 │
│           ↓ git push origin develop                             │
│                                                                 │
│  QA / STAGING (VPS - Dokploy)                                   │
│  └── Service watches: "develop" branch                          │
│      ├── qa.yourproject.com                                     │
│      └── api.qa.yourproject.com                                 │
│                                                                 │
│           ↓ git merge develop → main                            │
│                                                                 │
│  PRODUCTION (VPS - Dokploy)                                     │
│  └── Service watches: "main" branch                             │
│      ├── yourproject.com                                        │
│      └── api.yourproject.com                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌿 Git branching strategy

### Branches

| Branch        | Purpose                | Deploys to  |
|---------------|------------------------|-------------|
| `main`        | Production‑ready code  | Production  |
| `develop`     | Integration / QA       | QA / Staging|
| `feature/*`   | New features           | Local only  |
| `fix/*`       | Bug fixes              | Local only  |

### Branch rules

- Never push directly to `main` (except initial project setup).  
- All changes go through `develop` first.  
- Only merge `develop` → `main` when QA passes.

---

## 🛠️ Dokploy setup (two services)

### 1. QA / Staging service

| Setting          | Value                       |
|------------------|-----------------------------|
| Name             | `yourproject-qa`            |
| Branch           | `develop`                   |
| Compose Path     | `./docker-compose.prod.yml` |
| Frontend Domain  | `qa.yourproject.com`        |
| Backend Domain   | `api.qa.yourproject.com`    |

### 2. Production service

| Setting          | Value                       |
|------------------|-----------------------------|
| Name             | `yourproject-prod`          |
| Branch           | `main`                      |
| Compose Path     | `./docker-compose.prod.yml` |
| Frontend Domain  | `yourproject.com`           |
| Backend Domain   | `api.yourproject.com`       |

> Tip: In Dokploy, use separate environment variables per service (different DBs, API keys, and `NEXT_PUBLIC_POCKETBASE_URL` for QA vs Prod).

---

## 📝 Daily development workflow

### Starting new work

```
# 1. Start from latest develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Work locally
docker compose up
# Develop and test at http://localhost:3000
```

### Pushing to QA

```
# 1. Commit your changes
git add -A
git commit -m "Add user authentication"

# 2. Merge into develop
git checkout develop
git merge feature/user-authentication
git push origin develop

# → Dokploy QA service auto‑deploys from develop
# → Test at https://qa.yourproject.com and https://api.qa.yourproject.com
```

### Promoting to production

```
# After QA testing passes
git checkout main
git merge develop
git push origin main

# → Dokploy Prod service auto‑deploys from main
# → Live at https://yourproject.com and https://api.yourproject.com
```

---

## 🔄 Quick reference

### Daily commands

```
# Start work
git checkout develop && git pull

# Push to QA
git push origin develop

# Deploy to Production
git checkout main && git merge develop && git push origin main
```

### Emergency hotfix

```
# 1) Fix directly from main (emergency only)
git checkout main
git checkout -b fix/critical-bug
# ... make fix ...
git add -A
git commit -m "Fix critical bug"
git checkout main
git merge fix/critical-bug
git push origin main

# 2) Backport fix to develop
git checkout develop
git merge main
git push origin develop
```

---

## ⚠️ Important rules

1. Always test locally (`docker compose up`) before pushing.  
2. Never skip QA: changes must go Local → `develop` → QA → `main`.  
3. Do not push directly to `main`; always merge from `develop`.  
4. QA and Production must use **separate databases** and env vars.  
5. Keep Production secrets separate (different Dokploy service env).

---

## 📁 Environment variables per environment

### QA (`.env.qa` or Dokploy QA service)

```
NEXT_PUBLIC_POCKETBASE_URL=https://api.qa.yourproject.com
ADMIN_EMAIL=qa-admin@yourproject.com
# Test / sandbox API keys go here
```

### Production (`.env.prod` or Dokploy Prod service)

```
NEXT_PUBLIC_POCKETBASE_URL=https://api.yourproject.com
ADMIN_EMAIL=admin@yourproject.com
# Real production API keys go here
```

---

## ✅ Checklist before production deploy

- [ ] Feature tested locally (`docker compose up`).  
- [ ] Changes merged into `develop` and deployed to QA.  
- [ ] Tested on QA (no console or network errors).  
- [ ] Database migrations / schema changes verified.  
- [ ] Any reviewers / team approval done (if applicable).  
- [ ] `develop` merged into `main`.  
- [ ] Production deployment verified after Dokploy deploy.  

**Last Updated:** 2025‑12‑18 (aligned with current Dokploy / Compose setup).
