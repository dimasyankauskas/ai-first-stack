# 🎯 Antigravity Protocol - Quick Reference Card

**Print this. Keep it visible. Check it every session.**

---

## ⚡ SESSION START (60 seconds)

```
□ [1] Read AI_SYSTEM_INSTRUCTIONS.md
□ [2] Read workflow/.md file (if mentioned)
□ [3] Load package.json versions
□ [4] Output: "Stack loaded: Next.js X / PB Y"
```

---

## 🧠 BEFORE CODING (2 minutes)

```
□ [5] Read request 3x (literal, intent, constraints)
□ [6] Generate 3 approaches (Tree-of-Thoughts)
□ [7] Search ai-first-stack for patterns
□ [8] Output approach + trade-offs
```

---

## ✅ VERIFICATION MATRIX

Before using ANY resource:

| Type | Check | If Not Found |
|------|-------|--------------|
| npm package | ai-first-stack → package.json → npm | STOP & ASK |
| PocketBase API | 02_POCKETBASE_*.md | STOP & ASK |
| Docker image | 04_DOCKER_BUILD_GUIDE.md | STOP & ASK |

**Rule:** STOP = Don't guess. Ask user.

---

## 🏗️ PRE-COMMIT CHECKLIST

```
Architecture:
□ Logic divorced from UI?
□ Zod at data boundaries?
□ Error boundaries present?

PocketBase:
□ Using $app (not dao)?
□ e.next() FIRST in hooks?
□ Collection filter applied?

Next.js:
□ Server components default?
□ Client only when needed?
□ App Router structure correct?

Packages:
□ package.json + package-lock synced?
□ No invented names/versions?
□ All imports exist?

Docker:
□ Multi-stage build?
□ Correct base images?
□ Non-root user?
```

---

## 🚫 ANTI-PATTERNS (Never Use)

```
❌ dao() → ✅ $app.findRecordById()
❌ onRecordCreate → ✅ onRecordAfterCreateSuccess
❌ collection.schema → ✅ collection.fields
❌ Hardcoded versions → ✅ From package.json
❌ Invented packages → ✅ Verify in npm
```

---

## 💬 COMMUNICATION TIERS

```
1. Acknowledge: "Got it. [Restate request]"
2. Grounding: "Verified @file. Stack: versions"
3. Approach: "Using [X]. Trade-off: [Y vs Z]"
4. Execute: [Code with explanations]
5. Validate: "Self-review ✅. Ready to commit"
6. Next: "Complete. Ready for: A/B/C"
```

---

## 🎯 FILES TO READ (In Order)

**Always Read:**
1. AI_SYSTEM_INSTRUCTIONS.md
2. 01_QUICK_START.md
3. 02_POCKETBASE_0_3_4_API_REFERENCE.md
4. 04_DOCKER_BUILD_GUIDE.md
5. User's package.json

**If Relevant:**
- 09_UI_UX_STANDARDS.md (UI work)
- 06_DOKPLOY_DEPLOYMENT.md (deploying)
- .agent/workflows/*.md (workflow task)

---

## ⚡ SPEED vs. QUALITY

| Scenario | Protocol |
|----------|----------|
| "How do I...?" question | Fast: Answer from docs |
| Build feature | Methodical: Full protocol |
| Known bug fix | Fast: Pattern + fix |
| Unknown bug | Methodical: Investigate |
| Add component | Fast: Follow pattern |
| Refactor architecture | Methodical: Design first |

---

## 🔥 CRITICAL RULES

```
1. NEVER guess package versions
2. NEVER invent API methods
3. NEVER skip Phase 1-3
4. NEVER commit without review
5. ALWAYS cite grounding (@file)
6. ALWAYS show trade-offs
7. STOP if unsure → ASK
```

---

## 📊 POST-TASK (30 seconds)

```
□ What went wrong?
□ Root cause?
□ How to prevent?
□ Pattern learned?
```

**Goal:** Never repeat mistakes.

---

## 🚀 ONE-LINE START COMMAND

```
Run: Phase 1-3 → Verify all → Output grounding → Wait for approval
```

---

**Version:** 7.0 | **Updated:** 2025-12-19
**Print Date:** __________ | **Project:** __________
