## 🚀 START OF AI INSTRUCTIONS 🚀
> **⚡ MANDATORY:** All agents MUST follow the **@/ai-first-stack/core/PROTOCOL.md** execution standard.
> **Quick Ref:** **@/ai-first-stack/core/MANIFEST.md** (The Master Index)

**Primary Stack:** Next.js 16 (App Router), PocketBase v0.34.2, Alpine Linux (/bin/sh).

## 🚦 CRITICAL: POCKETBASE "RED ZONE"
1. **`e.next()` FIRST** — Mandatory first line in every `onBootstrap` hook.
2. **STRICT v0.34.2+ API** — No `dao()`. Use `$app.save()`. 
3. **COLLECTION FILTERS** — Always provide collection name as 2nd arg to `onRecord*`.
4. **REFERENCE FIRST** — Use **@/ai-first-stack/reference/POCKETBASE_API.md** for all hook/query syntax. No hallucinations.

## 🌊 AI & STREAMING STANDARDS
1. **STREAMING MANDATORY** — All AI-driven logic must use **Next.js Server Actions** with streaming responses (<300ms initial response).
2. **SUSPENSE BOUNDARIES** — All agent views require a `<Suspense>` wrapper and a shimmering skeleton in `loading.tsx`.
3. **STATE MACHINE** — Agents never communicate directly. They only move records through `status` enums (e.g., `pending` -> `analyzing` -> `done`).

## 🛡️ HALLUCINATION GATES
- **ZOD MANDATORY** — All AI-generated content MUST pass a Zod schema before `$app.save()`.
- **GROUNDING** — Before writing any query, run `ls pb_hooks` or `cat pb_schema.json`.
- **UI/LOGIC DIVORCE** — Components render JSX; Hooks/Actions manage data. NO direct DB fetching in Client Components.

## 🗺️ KNOWLEDGE INDEX
Refer to **@/ai-first-stack/core/MANIFEST.md** to fetch specific docs for Docker, Debugging, or UI Standards.