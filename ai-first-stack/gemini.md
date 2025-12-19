# Global Antigravity Rules (Gemini)

1. My tech stack for most workspaces is:
   - Next.js 16 (App Router)
   - PocketBase v0.34.2
   - Dokploy + Docker on a Linux VPS (Alpine containers, `/bin/sh` only).

2. PocketBase rules:
   - Only use PocketBase v0.34.x APIs.
   - Never use old v0.22 patterns such as `app.dao()` or `e.collection.name`.
   - In `onBootstrap`, always call `e.next()` as the first line before using `$app`.
   - In every `onRecord*` hook:
     - Filter by collection name as the second argument, e.g. `"my_collection"`.
     - Call `e.next()` to continue the execution chain.
     - Read the collection via `e.record.collection().name`.

3. Schema discipline:
   - Never invent PocketBase collections or fields.
   - Before writing hooks or queries, always ask me for the current schema (export or text).
   - If I cannot provide it, propose a `SCHEMA_PROPOSAL` and wait for my approval before generating code.
   - When changing schema, describe the change and give explicit migration steps (PocketBase UI or CLI).

4. URLs, env vars, and networking:
   - Frontend PocketBase calls must always use `NEXT_PUBLIC_POCKETBASE_URL`.
   - Dev example: `http://localhost:8090`.
   - Prod example: `https://api.<my-domain>.com`.
   - Never use Docker hostnames like `http://pocketbase:8090` in browser code.
   - Keep dev and prod values in env files, not hardcoded in code.

5. Docker / Dokploy assumptions:
   - PocketBase runs from a binary at `/pb/pocketbase` inside an Alpine container with `/pb/pb_data` as the data volume.
   - Next.js runs from a standalone build, `PORT=3000`, `HOSTNAME=0.0.0.0`, non-root user.
   - Traefik routes:
     - `api.<domain>` → PocketBase on 8090 (HTTPS).
     - `<domain>` / `www.<domain>` → Next.js on 3000 (HTTPS).

6. Shell and commands:
   - Assume `/bin/sh` (Alpine), not `bash`.
   - Do not use bash-only syntax such as `[[ ]]`, process substitution, or bash arrays.

7. Project documentation:
   - Many workspaces include:
     - `AI_SYSTEM_INSTRUCTIONS.md` in the repo root.
     - An `ai-first-stack/` or `templates/` folder with detailed docs (PocketBase API reference, Docker build guide, Dokploy deployment, Git workflow, local dev, etc.).
   - Treat those files as the **source of truth** for that project.
   - When needed, ask me to show relevant sections instead of relying on older online examples.

8. Pre-flight checklist for any non-trivial change:
   - Confirm the stack (Next.js 16 + PocketBase 0.34.2 + Dokploy).
   - Ask for:
     - Current PocketBase schema for the affected collections.
     - Relevant env vars (with secrets redacted).
     - Any relevant docs from `AI_SYSTEM_INSTRUCTIONS.md` or the `ai-first-stack`/`templates` folder.
   - Summarize what exists, then propose a step-by-step plan.
   - Wait for my approval before generating large amounts of code.

9. Implementation style:
   - Work in small, reviewable steps (one hook, one route, one component at a time).
   - After each step, tell me:
     - The file path.
     - How it integrates with existing code.
     - Any assumptions you made (fields, env vars, external services).

10. When unsure:
    - Explicitly state what you are unsure about.
    - Ask targeted questions.
    - Do not guess or silently invent APIs, schema, or configuration.
