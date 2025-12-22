# 🚀 Dokploy Next.js + PocketBase Stack

> **A battle-tested deployment template for modern AI & web apps. Production-ready template for deploying Next.js 16 + PocketBase 0.34.2 on a self-hosted Dokploy VPS.**  
> *Architected for speed by [Dimas](https://github.com/dimasyankauskas)*

***

## 💡 The "Why": Solving the Velocity Problem

As a **Head of Product**, my job is to maximize **product velocity** — reducing the time between an idea and a shipped feature. Yet, I constantly see teams losing days to "infra thrash" — Docker builds failing, SSL headaches, and complex routing.

I built **Dokploy Stack** to productize infrastructure. It is a repeatable, self-hosted template designed for **zero latency and massive build velocity**.

**The Outcome:**  
> In practice, teams using this template cut initial deployment setup **from weeks to hours**, allowing engineers to focus on shipping value rather than wrestling with YAML.

***

## 👨‍💻 About the Author

I'm **Dimas** — a **Head of Product & UX Design** based in the **San Francisco Bay Area** with ~17+ years of experience. I specialize in building "0-to-1" products and scaling AI-first teams.

I operate as a **Strategic Player-Coach**. While my primary focus is vision, portfolio strategy, and cross-functional alignment, I remain hands-on with code and design to prototype complex systems before handing them off to engineering.

**My Product Philosophy:**
* **Speed is functionality.** If you can't ship it, the design doesn't matter.
* **AI-Native.** AI isn't a feature; it's the core mechanic.
* **Full-Stack Fluency.** Understanding the stack allows me to design better constraints and clearer requirements.

### 🔬 What I'm Building & Leading

| Focus Area | The Strategic Value |
| :-- | :-- |
| 🧠 **AI-First Strategy** | Defining bets where AI is the core mechanic, aligning Data, UX, and Infra. |
| 🤖 **Multi-Agent Systems** | Architecting debuggable agent workflows that are reliable enough for production. |
| 👥 **Human-in-the-Loop** | Designing review flows where humans guide AI, ensuring safety and trust. |
| 🔄 **Self-Improving Products** | Building feedback loops where usage data automatically reduces technical debt. |
| 🎨 **Design Systems** | Creating scalable languages that allow Engineering to ship UI without constant pixel-pushing. |

***

## 🎮 Fun Fact: "Mobile-First" Prototyping

I often prototype **full-stack, multi-agent applications on my phone** using **Google AI Studio** — going from idea to deployed demo in a single session.

I describe the system and constraints to my AI agents, then iterate on code and UX until it’s ready for the team. Capturing those "AI eureka moments" is how I test whether a product vision is clear and shippable before we invest engineering hours.

***

## 🛠️ The Tech Stack

I selected these tools not just for performance, but for **developer experience** and **maintainability**.

| Component | Technology | Why I Chose It |
| :-- | :-- | :-- |
| **Build Engine** | **Antigravity + Cursor** | **The "Architect" Workflow.** Google Antigravity for 0-to-1 agentic orchestration; Cursor for high-speed, tactile code refinement. |
| **Frontend** | **Next.js 16** | The standard for React production apps. |
| **Backend** | **PocketBase** | SQLite-based BaaS. Zero latency, instant feedback loops. |
| **Deployment** | **Dokploy** | Self-hosted PaaS. The simplicity of Vercel on your own VPS. |
| **Container** | **Docker** | Consistency across Dev and Prod. |
| **AI/ML** | **Ollama / Gemini** | Local LLMs for privacy; Gemini for reasoning. |

***

## 🎯 What This Repository Delivers

**Dokploy Stack** is a comprehensive template to deploy a **Next.js + PocketBase** app with fully automated SSL and routing.

### Key Capabilities

* ✅ **Production-Ready:** Traefik routing, Let's Encrypt SSL, and Health Checks.
* ✅ **PocketBase w/ JS Hooks:** Built from source (Go 1.22) to enable custom backend logic.
* ✅ **Mobile Architected:** Includes API patterns for iPhone Shortcuts and external clients.
* ✅ **Developer Experience:** One-command setup for local dev and production.

***

## 📁 Repository Structure

```
ai-first-stack/
│
├── 📁 core/                               # Core protocol files (ALWAYS LOAD)
│   ├── PROTOCOL.md                        # Antigravity Protocol v7.1
│   ├── MANIFEST.md                        # Navigation index (v2.0)
│   └── RULES.md                           # Technical law & Red Zone rules
│
├── 📁 reference/                          # API & standards documentation
│   ├── POCKETBASE_API.md                  # Complete PB v0.34.2 API
│   ├── DOCKER_BUILD.md                    # Docker build patterns
│   └── UI_UX_STANDARDS.md                 # UI/UX & Logic Divorce
│
├── 📁 guides/                             # Step-by-step tutorials
│   ├── QUICK_START.md                     # Get started in 30 minutes
│   ├── POCKETBASE_CHEATSHEET.md           # One-page PB cheat sheet
│   ├── DEVELOPMENT.md                     # Local & prod development
│   ├── DEPLOYMENT.md                      # Dokploy production deployment
│   ├── GIT_WORKFLOW.md                    # Git branching strategy
│   ├── LOCAL_DEV.md                       # Local dev environment
│   └── TEMPLATES.md                       # Copy-paste file templates
│
├── 📁 archive/                            # Reference & legacy docs
│   ├── MOBILE_SHORTCUTS.md                # iPhone Shortcuts API
│   └── MOBILE_UPLOAD_ARCHITECTURE_REVIEW.md
│
└── 📁 templates/                          # Starter files
    ├── Dockerfile.pocketbase              # PocketBase with JS hooks
    ├── Dockerfile.frontend                # Next.js standalone build
    ├── docker-compose.prod.yml            # Production (Dokploy)
    └── .env.example                       # Environment template
```

***

## 🔧 Tech Stack Details

### Frontend

- **Next.js 16** with App Router  
- **TypeScript** for type safety  
- **Tailwind CSS** for styling  
- **Zustand** for state management  
- **Standalone output** for Docker deployment  

### Backend

- **PocketBase v0.34.2**  
- Built from `examples/base` for JavaScript hooks support, using Go 1.22 in Docker with `CGO_ENABLED=0` (pure Go SQLite).  
- **SQLite** embedded database  
- **Real-time subscriptions** out of the box  

### Infrastructure

- **Dokploy** – Self-hosted Heroku/Vercel alternative  
- **Traefik** – Automatic routing & SSL  
- **Docker Compose** – Multi-container orchestration  
- **Let's Encrypt** – Free SSL certificates  

***

## 🚀 How To Use This Repository

### Option 1: Clone What You Need (Recommended)

```
# Clone the entire template
git clone https://github.com/dimasyankauskas/dokploy-stack.git

# Copy files you need to your project
cp dokploy-stack/templates/* your-project/
cp dokploy-stack/docs/* your-project/docs/
```

### Option 2: Add as Git Submodule

```
cd your-project
git submodule add https://github.com/dimasyankauskas/dokploy-stack.git docs/templates

# Update submodule later
git submodule update --remote docs/templates
```

### Option 3: Use as Template Repository

1. Click **"Use this template"** on GitHub  
2. Create your new project  
3. Customize the templates for your domain  

***

## ✅ Features & Solutions Included

### Docker Builds

- ✅ PocketBase built from source with JS hooks  
- ✅ Multi-stage builds for small images  
- ✅ Go 1.22 for PocketBase v0.34.2  
- ✅ `CGO_ENABLED=0` (pure Go SQLite)  
- ✅ Binary verification in build  

### Deployment

- ✅ Traefik labels for automatic routing  
- ✅ Let's Encrypt SSL configuration  
- ✅ Health checks for containers  
- ✅ Volume mounts for persistence  
- ✅ Environment variable management  

### PocketBase

- ✅ Collection schema enforcement on bootstrap  
- ✅ Custom API routes with authentication  
- ✅ Token-based auth for mobile apps  
- ✅ Real-time subscriptions  
- ✅ Migration from v0.22 patterns documented  

### Development

- ✅ Local Docker setup  
- ✅ Hot-reload configuration  
- ✅ Environment separation (dev/prod)  
- ✅ Git workflow with QA branch  

***

## 📝 Quick Start Checklist

```
□ Clone this repository
□ Copy templates to your project
□ Update domain names in docker-compose.prod.yml
□ Set up DNS A records pointing to VPS
□ Configure environment variables in Dokploy
□ Deploy and verify
□ Create PocketBase admin user
□ Test frontend connection
```

***

## 🙏 Acknowledgments

This documentation was battle-tested on multiple production deployments:

- Self-hosted VPS (Dokploy)  
- PocketBase with JavaScript hooks  
- Next.js App Router applications  
- iPhone Shortcuts integrations  

***

## 📄 License

Licensed under the **Apache License, Version 2.0** – See [LICENSE](LICENSE) for details.

## 🔗 GitHub

[![GitHub](https://img.shields.io/badge/GitHub-dimasyankauskas-181717?style=for-the-badge&logo=github)](https://github.com/dimasyankauskas/ai-first-stack)

***

## 🐛 Found a Problem?

If you find issues or have improvements:

1. Open an issue  
2. Submit a PR  
3. Star the repo if it helped you!  

***

*Architected with vision, precision, and purpose by Dimas* 🎉
```

[1](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/0130cdc1-2260-4aa7-b548-14a681a27a71/README.md)
[2](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/56636679-4370-4a3f-8750-d408e57a8e18/04_DOCKER_BUILD_GUIDE.md)
[3](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/151165222/a57490cc-25ce-4050-ae8a-331369fda6ff/01_QUICK_START.md)