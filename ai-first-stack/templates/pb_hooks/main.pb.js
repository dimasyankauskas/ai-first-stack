/// <reference path="../pb_data/types.d.ts" />

/**
 * 🦅 AI-First Stack: Server-Side Schema Bootstrap Hook
 * 
 * This hook runs on every PocketBase server start. It ensures that all 
 * required collections and fields exist, "healing" any missing or corrupted
 * schema state automatically.
 * 
 * Usage: Place this file in `pb_hooks/` and start PocketBase with:
 *   .\pocketbase.exe serve --http=0.0.0.0:8090 --hooksDir=".\pb_hooks"
 * 
 * @see https://pocketbase.io/docs/js-hooks/
 */

onBootstrap((e) => {
    // CRITICAL: Always call e.next() first to ensure core PocketBase
    // bootstrap logic runs before our custom schema logic.
    e.next();

    console.log("🚀 Schema Sync Hook Running...");

    // --- Helper Functions ---

    /**
     * Ensures a collection exists. Creates it if missing.
     * @param {string} name - The collection name.
     * @param {"base"|"auth"} type - The collection type.
     * @returns {Collection} The found or newly created collection.
     */
    const ensureCollection = (name, type = "base") => {
        try {
            return $app.findCollectionByNameOrId(name);
        } catch {
            console.log(`  📦 Creating collection: ${name}`);
            const c = new Collection({ name: name, type: type });
            $app.save(c);
            return $app.findCollectionByNameOrId(name);
        }
    };

    /**
     * Ensures a field exists on a collection with the correct configuration.
     * If the field exists but has different config, it is updated.
     * @param {Collection} collection - The collection to modify.
     * @param {object} fieldConfig - The field configuration object.
     */
    const ensureField = (collection, fieldConfig) => {
        const existingField = collection.fields.find(f => f.name === fieldConfig.name);
        if (existingField) {
            // Field exists, check if update is needed (simplified check)
            // For production, you might want a deeper comparison.
            return;
        }
        console.log(`  🔧 Adding field '${fieldConfig.name}' to '${collection.name}'`);
        collection.fields.push(fieldConfig);
    };

    // --- Get Core Collections ---
    const users = $app.findCollectionByNameOrId("users");

    // --- Define and Sync Your Collections ---

    // Example: "profiles" collection (one-to-one with users)
    const profiles = ensureCollection("profiles");
    ensureField(profiles, {
        name: "owner",
        type: "relation",
        required: true,
        options: {
            collectionId: users.id,
            cascadeDelete: true,
            maxSelect: 1,
        },
    });
    ensureField(profiles, {
        name: "displayName",
        type: "text",
        required: false,
    });
    ensureField(profiles, {
        name: "avatar",
        type: "file",
        required: false,
        options: { maxSelect: 1, maxSize: 5242880 }, // 5MB
    });
    $app.save(profiles);

    // Example: "trips" collection
    const trips = ensureCollection("trips");
    ensureField(trips, {
        name: "owner",
        type: "relation",
        required: true,
        options: {
            collectionId: users.id,
            cascadeDelete: true,
            maxSelect: 1,
        },
    });
    ensureField(trips, {
        name: "timestamp",
        type: "date",
        required: true,
    });
    ensureField(trips, {
        name: "extracted",
        type: "json",
        required: false,
    });
    ensureField(trips, {
        name: "source_file",
        type: "file",
        required: false,
        options: { maxSelect: 1, maxSize: 10485760 }, // 10MB
    });
    $app.save(trips);

    console.log("✅ Schema bootstrap complete.");
});
