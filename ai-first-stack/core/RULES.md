## 🚀 START OF AI INSTRUCTIONS 🚀
> **⚡ MANDATORY:** All agents MUST follow the **@/ai-first-stack/core/PROTOCOL.md** execution standard.
> **Quick Ref:** **@/ai-first-stack/core/MANIFEST.md** (The Master Index)

**Primary Stack:** Next.js 16 (App Router), PocketBase v0.34.2, Alpine Linux (/bin/sh).

## 🚦 CRITICAL: POCKETBASE "RED ZONE" {#pocketbase-red-zone}

These rules are **non-negotiable**. Violation causes silent failures or data corruption.

1. **`e.next()` FIRST** — Must be the first line in every `onBootstrap` hook.
2. **NO `dao()`** — Deprecated in v0.34.x, use `$app.save()` instead.
3. **Collection Filter Required** — Always provide collection name as 2nd arg to `onRecord*`.
4. **Logic Divorce** — Hooks manage data (`$app`); Components render JSX. NO fetching in UI.

## 🛡️ HALLUCINATION GATES
- **Grounding:** Before writing any query, run `ls pb_hooks` or `cat pb_schema.json`.
- **Reference:** If a method isn't in `@/ai-first-stack/reference/POCKETBASE_API.md`, it DOES NOT EXIST.
- **Unsure:** STOP and ask. Never guess collection or field names.

## 🗺️ KNOWLEDGE INDEX
Refer to `@/ai-first-stack/core/MANIFEST.md` to fetch specific docs for Docker, Debugging, or UI Standards.

