## 🚀 START OF AI INSTRUCTIONS 🚀
> **⚡ MANDATORY:** All agents MUST follow the **@/ai-first-stack/core/00_PROTOCOL.md** execution standard.
> **Quick Ref:** **@/ai-first-stack/core/00_MANIFEST.md** (The Master Index)
**Primary Stack:** Next.js 16 (App Router), PocketBase v0.34.2, Alpine Linux (/bin/sh).

## 🚦 CRITICAL: POCKETBASE "RED ZONE"
1. **Boot Order:** `e.next()` MUST be the first line in every `onBootstrap` hook.
2. **Hook Isolation:** Always provide collection name as the 2nd argument in `onRecord*`.
3. **Logic Divorce:** Hooks manage data ($app); Components render JSX. NO fetching in UI.

## 🛡️ HALLUCINATION GATES
- **Grounding:** Before writing any query, run `ls pb_hooks` or `cat pb_schema.json`.
- **Reference:** If a method isn't in `@/ai-first-stack/ref/02_POCKETBASE_0_3_4_API_REFERENCE.md`, it DOES NOT EXIST.
- **Unsure:** STOP and ask. Never guess collection or field names.

## 🗺️ KNOWLEDGE INDEX
Refer to `@/ai-first-stack/core/00_MANIFEST.md` to fetch specific docs for Docker, Debugging, or UI Standards.