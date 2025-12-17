# 📘 PocketBase v0.34.2 Complete API Reference

**The ONLY guide you need for PocketBase v0.34.2+**

**For:** All fresh projects | Latest API | Future-proof

---

## 🎯 Critical Changes from v0.22 → v0.34.2

### The Big Picture

1.  **NO `dao()`** - Everything is on `$app`.
2.  **NO `SchemaField`** - Use Typed Fields (`TextField`, `RelationField`, etc.).
3.  **`collection.schema`** is now **`collection.fields`**.

```javascript
// ❌ v0.22 (OLD - Don't use)
$app.dao().saveRecord()
collection.schema.addField(new SchemaField({...}))

// ✅ v0.34.2 (NEW - Use this!)
$app.save()
collection.fields.add(new TextField({...}))
```

---

## 📚 Complete API Reference

### 1. Database Operations

#### Finding Records

```javascript
// Find by ID
const record = $app.findRecordById("posts", "RECORD_ID");

// Find first match
const record = $app.findFirstRecordByFilter("posts", "status = 'active'");

// Find all matching
const records = $app.findRecordsByFilter("posts", "user = 'USER_ID'", "-created", 10);
//                                                    filter      sort   limit

// Count records
const count = $app.countRecords("posts", "status = 'published'");

// Query builder (advanced)
const records = $app.findRecordsByQuery(
    "posts",
    $dbx.exp("status = {:status} AND views > {:min}", {
        status: "active",
        min: 100
    })
);
```

#### Saving Records

```javascript
// Create new record
const collection = $app.findCollectionByNameOrId("posts");
const record = new Record(collection);
record.set("title", "Hello World");
record.set("content", "My first post");
record.set("author", $app.authRecord().id);
$app.save(record);

// Update existing record
const record = $app.findRecordById("posts", "xyz");
record.set("title", "Updated Title");
$app.save(record);

// Increment/decrement (modifiers)
record.set("views+", 1);     // Increment
record.set("likes-", 1);     // Decrement
$app.save(record);
```

#### Deleting Records

```javascript
const record = $app.findRecordById("posts", "xyz");
$app.delete(record);
```

---

### 2. Collections

#### Finding Collections

```javascript
// By name or ID
const collection = $app.findCollectionByNameOrId("posts");

// Check if exists
let exists = false;
try {
    $app.findCollectionByNameOrId("posts");
    exists = true;
} catch (e) {
    exists = false;
}
```

#### Creating/Updating Collections

```javascript
// Create new collection
const collection = new Collection();
collection.name = "posts";
collection.type = "base"; // or "auth" or "view"

// Set privacy rules
collection.listRule = "@request.auth.id != \"\"";
collection.viewRule = "@request.auth.id != \"\"";
collection.createRule = "@request.auth.id != \"\"";
collection.updateRule = "@request.auth.id = author";
collection.deleteRule = "@request.auth.id = author";

// Add fields (v0.34.2+: Use Typed Fields, NOT SchemaField)
collection.fields.add(new TextField({
    name: "title",
    required: true,
    max: 200
}));

collection.fields.add(new RelationField({
    name: "author",
    required: true,
    collectionId: "USERS_COLLECTION_ID",
    maxSelect: 1,
    cascadeDelete: false
}));

// Save collection
$app.save(collection);
```

---

### 3. File Handling

#### Uploading Files

```javascript
// Single file
record.set("avatar", $filesystem.fileFromPath("/path/to/file.jpg"));

// Multiple files
record.set("gallery", [
    $filesystem.fileFromPath("/path/to/img1.jpg"),
    $filesystem.fileFromPath("/path/to/img2.jpg")
]);

// From uploaded files in route
routerAdd("POST", "/upload", (e) => {
    const files = e.findUploadedFiles("file");  // "file" is form field name
    
    const record = new Record($app.findCollectionByNameOrId("uploads"));
    record.set("file", files[0]);  // First file
    $app.save(record);
    
    return e.json(200, { id: record.id });
});
```

---

###  4. Event Hooks

#### Hook Structure (NEW in v0.23)

```javascript
// ✅ v0.23 pattern - use e.next()
onBootstrap((e) => {
    // Code BEFORE e.next() runs BEFORE bootstrap
    console.log("Before bootstrap");
    
    e.next();  // Continue execution chain
    
    // Code AFTER e.next() runs AFTER bootstrap
    console.log("After bootstrap complete");
});
```

#### Common Hooks

```javascript
// Application lifecycle
onBootstrap((e) => { e.next(); /* init code */ });
onServe((e) => { e.next(); /* server start */ });
onTerminate((e) => { e.next(); /* cleanup */ });

// Record operations
onRecordCreate((e) => {
    // Before record creation
    const record = e.record;
    console.log("Creating:", record.get("title"));
    e.next();
});

onRecordAfterCreateSuccess((e) => {
    // After record created successfully
    console.log("Created:", e.record.id);
});

onRecordUpdateRequest((e) => {
    // Validate before update
    if (e.record.get("status") === "locked") {
        throw new BadRequestError("Cannot update locked record");
    }
    e.next();
});

// Auth hooks
onRecordAuthWithPasswordRequest((e) => {
    console.log("Login attempt:", e.record.get("email"));
    e.next();
});
```

---

### 5. Routing (Custom Endpoints)

#### Basic Routes

```javascript
// ✅ v0.23 syntax - {param} NOT :param
routerAdd("GET", "/hello/{name}", (e) => {
    const name = e.request.pathValue("name");  // Get path parameter
    
    return e.json(200, { message: `Hello ${name}!` });
});

// POST with body
routerAdd("POST", "/api/create", (e) => {
    const info = e.requestInfo();
    const body = info.body;  // v0.23: .body instead of .data
    
    const record = new Record($app.findCollectionByNameOrId("posts"));
    record.set("title", body.title);
    record.set("content", body.content);
    $app.save(record);
    
    return e.json(200, { id: record.id });
});
```

#### Middleware

```javascript
// Require authentication
routerAdd("GET", "/protected", (e) => {
    return e.json(200, { user: e.auth.id });
}, $apis.requireAuth());

// Require admin
routerAdd("GET", "/admin-only", (e) => {
    return e.json(200, { message: "Admin access" });
}, $apis.requireSuperuser());
```

#### Request Info

```javascript
routerAdd("POST", "/api/endpoint", (e) => {
    const info = e.requestInfo();
    
    // Body (v0.23: .body instead of .data)
    const body = info.body;
    const title = body.title;
    
    // Query parameters
    const page = info.query.page || "1";
    
    // Headers
    const auth = info.headers["authorization"];
    
    // Auth user
    const user = e.auth;  // or info.auth
    
    return e.json(200, { received: true });
});
```

---

### 6. HTTP Requests (Calling External APIs)

```javascript
routerAdd("GET", "/fetch-data", (e) => {
    const res = $http.send({
        url: "https://api.example.com/data",
        method: "GET",
        headers: {
            "Authorization": "Bearer TOKEN",
            "Content-Type": "application/json"
        }
    });
    
    if (res.statusCode !== 200) {
        throw new BadRequestError("API request failed");
    }
    
    const data = res.json;
    return e.json(200, data);
});

// POST request
const res = $http.send({
    url: "https://api.example.com/create",
    method: "POST",
    body: JSON.stringify({ name: "Test" }),
    headers: { "Content-Type": "application/json" }
});
```

---

### 7. Utilities

#### Security

```javascript
// Generate random string
const token = $security.randomString(32);

// Generate random string (alphanumeric only)
const code = $security.randomStringWithAlphabet(6, "0123456789");

// Hash password
const hash = $security.hash("mypassword");

// Verify hash
const isValid = $security.hashCheck("mypassword", hash);
```

#### Tokens/JWT

```javascript
// Parse JWT
const claims = $security.parseUnverifiedJWT("TOKEN_STRING");

// Create JWT
const token = $security.createJWT({
    userId: "123",
    exp: $security.timestamp() + 3600
}, "SECRET_KEY");
```

---

## 🔄 Migration Quick Reference

| Task | v0.22 (OLD) | v0.23 (NEW) |
|------|-------------|-------------|
| Find record | `$app.dao().findRecordById()` | `$app.findRecordById()` |
| Save record | `$app.dao().saveRecord(record)` | `$app.save(record)` |
| Delete record | `$app.dao().deleteRecord(record)` | `$app.delete(record)` |
| Find collection | `$app.dao().findCollectionByNameOrId()` | `$app.findCollectionByNameOrId()` |
| Save collection | `$app.dao().saveCollection()` | `$app.save(collection)` |
| Hook pattern | `onAfterBootstrap((e) => {})` | `onBootstrap((e) => { e.next(); })` |
| Route params | `"/hello/:name"` | `"/hello/{name}"` |
| Request data | `info.data` | `info.body` |
| Collection schema | `collection.schema` | Still `collection.schema` ✅ |

---

## 📝 Complete Schema Enforcer Template (v0.23)

```javascript
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
    e.next();  // Run after bootstrap
    
    console.log("[SCHEMA] Starting validation...");
    
    // Get users collection
    const users = $app.findCollectionByNameOrId("users");
    const usersId = users.id;
    
    // Helper function
    const ensureCollection = (config) => {
        let collection;
        try {
            collection = $app.findCollectionByNameOrId(config.name);
        } catch (e) {
            collection = new Collection();
            collection.name = config.name;
            collection.type = config.type || "base";
        }
        
        // Set rules
        collection.listRule = config.listRule;
        collection.viewRule = config.viewRule;
        collection.createRule = config.createRule;
        collection.updateRule = config.updateRule;
        collection.deleteRule = config.deleteRule;
        
        // Create Field Helper (v0.34.2+)
        const createField = (f) => {
             const opts = { name: f.name, required: f.required, ...f.options };
             switch(f.type) {
                 case "text": return new TextField(opts);
                 case "relation": return new RelationField(opts);
                 case "select": return new SelectField(opts);
                 case "bool": return new BoolField(opts);
                 case "number": return new NumberField(opts);
                 case "date": return new DateField(opts);
                 case "json": return new JSONField(opts);
                 // Add others as needed
                 default: throw new Error("Unknown type: " + f.type);
             }
        };

        // Clear and add fields
        // v0.34.2: collection.fields is a FieldsList
        const existing = collection.fields.clone();
        for (const f of existing) {
            if (!f.system) collection.fields.removeById(f.id);
        }
        
        if (config.schema) {
            config.schema.forEach(fieldConfig => {
                collection.fields.add(createField(fieldConfig));
            });
        }
        
        $app.save(collection);
        console.log(`[SCHEMA] ✓ ${config.name}`);
        return collection;
    };
    
    // Define collections
    const posts = ensureCollection({
        name: "posts",
        type: "base",
        schema: [
            { name: "title", type: "text", required: true, options: { max: 200 } },
            { name: "content", type: "text", options: {} },
            { name: "author", type: "relation", required: true, options: { 
                collectionId: usersId, 
                maxSelect: 1,
                cascadeDelete: false
            }}
        ],
        listRule: "@request.auth.id != \"\"",
        viewRule: "@request.auth.id != \"\"",
        createRule: "@request.auth.id != \"\"",
        updateRule: "@request.auth.id = author",
        deleteRule: "@request.auth.id = author"
    });
    
    console.log("[SCHEMA] Complete!");
});
```

---

## 🎯 Best Practices

### 1. Always Use `e.next()`

```javascript
// ✅ CORRECT
onBootstrap((e) => {
    e.next();  // Always call this
    // Your code here
});

// ❌ WRONG - Will break execution chain
onBootstrap((e) => {
    // Missing e.next()!
    console.log("This will cause issues");
});
```

### 2. Error Handling

```javascript
routerAdd("POST", "/api/create", (e) => {
    const info = e.requestInfo();
    
    if (!info.body.title) {
        throw new BadRequestError("Title is required");
    }
    
    try {
        const record = new Record($app.findCollectionByNameOrId("posts"));
        record.set("title", info.body.title);
        $app.save(record);
        return e.json(200, { id: record.id });
    } catch (err) {
        throw new BadRequestError(`Failed to create: ${err}`);
    }
});
```

### 3. Type Safety with TypeScript

```javascript
/// <reference path="../pb_data/types.d.ts" />

// PocketBase auto-generates types for:
// - $app
// - $http
// - $security
// - All your collections

// This gives you autocomplete in VS Code!
```

---

## ⚡ Quick Snippets

### Create Record
```javascript
const record = new Record($app.findCollectionByNameOrId("COLLECTION"));
record.set("fieldName", "value");
$app.save(record);
```

### Update Record
```javascript
const record = $app.findRecordById("COLLECTION", "ID");
record.set("fieldName", "newValue");
$app.save(record);
```

### Delete Record
```javascript
const record = $app.findRecordById("COLLECTION", "ID");
$app.delete(record);
```

### Custom Route
```javascript
routerAdd("GET", "/api/hello", (e) => {
    return e.json(200, { message: "Hello!" });
});
```

---

**This guide covers 99% of what you need for PocketBase v0.23.x!** 🚀

**Remember:** NO `dao()` in v0.23 - everything is directly on `$app`!
