# 🦅 PocketBase Local Development Manual (Windows)

> [!NOTE]
> This guide is for running **PocketBase natively on Windows** for local testing. For Docker-based local dev, see [`docker-compose.yml`](../templates/docker-compose.yml). For VPS deployment, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## 🚨 Post-Mortem: Common Schema Sync Failures

During initial setup, you may encounter a critical failure loop where the **Schema (e.g., Trips/Profiles)** fails to sync or results in "Ghost Collections" (tables that exist but have no columns).

### Root Cause Analysis
1.  **Client-Side Fragility**: Pushing schema using a Node.js script via the HTTP API is brittle because:
    *   It requires perfect HTTP handling of `relation` IDs (e.g., getting the exact UUID of the `users` collection).
    *   If it crashes halfway (network/error), it leaves a "half-created" collection.
    *   Subsequent runs see "Collection Exists" and skip the repair, leaving you with an empty table.
2.  **Missing Hooks**: PocketBase v0.34+ relies heavily on **Hooks** (`pb_hooks/*.pb.js`) for robust schema management. Running `pocketbase.exe serve` *without* the `--hooksDir` flag means your server-side repair scripts are ignored.

### The Solution (Server-Side Bootstrap)
Instead of "pushing" the schema over HTTP, use a hook (`main.pb.js`) that lives *inside* PocketBase. When the server starts, it checks itself and "heals" any missing fields instantly.

---

## 🛠️ Setup Instructions

### 1. File Structure
Ensure your project root looks like this:
```
/<your-project>
  ├── pocketbase.exe          <-- The executable
  ├── pb_hooks/               <-- CRITICAL: Your schema logic lives here
  │     └── main.pb.js
  ├── pb_data/                <-- Database files (git-ignored)
  └── ...
```

### 2. The Bootstrap Hook
Your `pb_hooks/main.pb.js` is the source of truth for schema integrity.

> [!TIP]
> A production-ready template is available at [`/templates/pb_hooks/main.pb.js`](file:///d:/AI/buildfutures-ai/ai-first-stack/ai-first-stack/templates/pb_hooks/main.pb.js).

**Simplified Example:**
```javascript
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
    e.next(); // Always run first!

    const users = $app.findCollectionByNameOrId("users");

    // Helper to ensure collection exists
    const ensure = (name) => {
        try { return $app.findCollectionByNameOrId(name); }
        catch { 
            const c = new Collection({ name: name, type: "base" });
            $app.save(c);
            return c;
        }
    }

    // Example: Sync the "trips" collection
    const trips = ensure("trips");
    
    // Add/repair fields as needed
    // See the full template for production-ready field sync logic.
    $app.save(trips);
    
    console.log("✅ Schema bootstrap complete.");
});
```

### 3. Starting the Server (CRITICAL)
You **MUST** tell PocketBase where the hooks are.

**❌ WRONG:**
```powershell
.\pocketbase.exe serve
```
*(This loads default empty PocketBase. Your hook code does nothing.)*

**✅ CORRECT:**
```powershell
.\pocketbase.exe serve --http=0.0.0.0:8090 --hooksDir=".\pb_hooks"
```
*(This loads your hooks. The schema will self-repair on startup.)*

---

## ⚡ Troubleshooting "Ghost" Collections

If you suspect your database is corrupted (e.g., data uploads work but data is missing):

1.  **Stop the Server** (`Ctrl+C`).
2.  **Delete `pb_data`** (Optional - triggers full wipe).
3.  **Restart with Hooks**:
    ```powershell
    .\pocketbase.exe serve --http=0.0.0.0:8090 --hooksDir=".\pb_hooks"
    ```
4.  **Watch the Console**: You should see logs like:
    > `🚀 Schema Sync Hook Running...`
    > `✅ Schema bootstrap complete.`

## 🔍 Verification
Always verify your schema before debugging application code.

1.  Go to the **PocketBase Admin Dashboard**: `http://127.0.0.1:8090/_/`
2.  Navigate to **Collections**.
3.  Check your collection schema: Does it have all expected fields (e.g., `owner`, `timestamp`, `extracted`)?
4.  If ONLY `id` exists → You have a Ghost Collection. Restart with the `--hooksDir` flag.
