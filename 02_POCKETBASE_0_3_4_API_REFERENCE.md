Here is a cleaned‑up, version‑correct, and AI‑safe rewrite of **02_POCKETBASE_0_3_4_API_REFERENCE.md** that stays consistent with your other docs.[1][2]

***

```md
# 📘 PocketBase v0.34.2+ API Reference

The **primary guide** for PocketBase **v0.34.2+** used in your AI‑First Stack.

For: all new projects using PocketBase v0.34.x, with JavaScript hooks and custom routes.

> This guide assumes you are following `AI_SYSTEM_INSTRUCTIONS.md` (no `dao()`, strict hook rules, schema discipline). [file:43]

---

## 🎯 Critical Changes from v0.22 → v0.34.2

### Big picture

1. **No `dao()`** – all operations are on `$app`.
2. **No `SchemaField`** – use typed fields (`TextField`, `RelationField`, etc.).
3. **`collection.schema` → `collection.fields`** – fields list.

```
// ❌ v0.22 (OLD – do not use)
$app.dao().saveRecord()
collection.schema.addField(new SchemaField({...}))

// ✅ v0.34.2+ (NEW – use this)
$app.save(recordOrCollection)
collection.fields.add(new TextField({...}))
```

---

## 1. Database Operations

### 1.1 Finding records

```
// Find by ID
const record = $app.findRecordById("posts", "RECORD_ID");

// Find first match
const record = $app.findFirstRecordByFilter("posts", "status = 'active'");

// Find all matching (with sort + limit)
const records = $app.findRecordsByFilter(
  "posts",
  "user = 'USER_ID'",
  "-created", // sort
  10          // limit
);

// Count records
const count = $app.countRecords("posts", "status = 'published'");

// Query builder with $dbx
const records = $app.findRecordsByQuery(
  "posts",
  $dbx.exp("status = {:status} AND views > {:min}", {
    status: "active",
    min: 100,
  })
);
```

### 1.2 Saving records

```
// Create new record
const posts = $app.findCollectionByNameOrId("posts");
const record = new Record(posts);

record.set("title", "Hello World");
record.set("content", "My first post");

// In hooks/routes with auth middleware, use e.auth / info.auth:
record.set("author", e.auth.id);

$app.save(record);

// Update existing record
const recordToUpdate = $app.findRecordById("posts", "xyz");
recordToUpdate.set("title", "Updated Title");
$app.save(recordToUpdate);

// Increment/decrement numeric fields
recordToUpdate.set("views+", 1);  // increment
recordToUpdate.set("likes-", 1);  // decrement
$app.save(recordToUpdate);
```

### 1.3 Deleting records

```
const record = $app.findRecordById("posts", "xyz");
$app.delete(record);
```

---

## 2. Collections

### 2.1 Finding collections

```
// By name or ID
const collection = $app.findCollectionByNameOrId("posts");

// Check if exists
let exists = false;
try {
  $app.findCollectionByNameOrId("posts");
  exists = true;
} catch (_) {
  exists = false;
}
```

### 2.2 Creating/updating collections (typed fields)

```
const collection = new Collection();
collection.name = "posts";
collection.type = "base"; // "base" | "auth" | "view"

// Access rules
collection.listRule = "@request.auth.id != \"\"";
collection.viewRule = "@request.auth.id != \"\"";
collection.createRule = "@request.auth.id != \"\"";
collection.updateRule = "@request.auth.id = author";
collection.deleteRule = "@request.auth.id = author";

// Typed fields (v0.34.x)
collection.fields.add(new TextField({
  name: "title",
  required: true,
  max: 200,
}));

collection.fields.add(new RelationField({
  name: "author",
  required: true,
  collectionId: "USERS_COLLECTION_ID",
  maxSelect: 1,
  cascadeDelete: false,
}));

$app.save(collection);
```

> Remember: in v0.34.x you manipulate `collection.fields` (a fields list), not `collection.schema`. [file:46]

---

## 3. File Handling

### 3.1 Uploading files (from filesystem)

```
// Single file
record.set("avatar", $filesystem.fileFromPath("/path/to/file.jpg"));

// Multiple files (multi-file field)
record.set("gallery", [
  $filesystem.fileFromPath("/path/to/img1.jpg"),
  $filesystem.fileFromPath("/path/to/img2.jpg"),
]);

$app.save(record);
```

### 3.2 Uploading from request (route)

```
routerAdd("POST", "/upload", (e) => {
  const files = e.findUploadedFiles("file"); // "file" is form field name

  if (!files || files.length === 0) {
    throw new BadRequestError("No file provided");
  }

  const uploads = $app.findCollectionByNameOrId("uploads");
  const record = new Record(uploads);
  record.set("file", files);

  try {
    $app.save(record);
    return e.json(200, { id: record.id });
  } catch (err) {
    throw new BadRequestError(`Upload failed: ${err.message}`);
  }
});
```

---

## 4. Event Hooks

> Hooks are **high‑risk**: always follow your `AI_SYSTEM_INSTRUCTIONS.md` rules (`e.next()` and collection filters). [file:43]

### 4.1 Basic hook structure

```
// v0.23+ pattern: use e.next()
onBootstrap((e) => {
  // Code BEFORE e.next() runs before bootstrap
  console.log("Before bootstrap");

  e.next(); // continue execution chain – MUST be called

  // Code AFTER e.next() runs after bootstrap
  console.log("After bootstrap complete");
});
```

### 4.2 Common hooks

```
// Application lifecycle
onBootstrap((e) => { e.next(); /* init */ });
onServe((e) => { e.next(); /* server start */ });
onTerminate((e) => { e.next(); /* cleanup */ });

// Record lifecycle – ALWAYS filter by collection
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  console.log("Creating:", record.get("title"));
  e.next();
}, "posts");

onRecordAfterCreateSuccess((e) => {
  console.log("Created:", e.record.id);
}, "posts");

onRecordBeforeUpdateRequest((e) => {
  if (e.record.get("status") === "locked") {
    throw new BadRequestError("Cannot update locked record");
  }
  e.next();
}, "posts");

// Auth hooks
onRecordAuthWithPasswordRequest((e) => {
  console.log("Login attempt:", e.record.get("email"));
  e.next();
}, "users");
```

### 4.3 Validation hooks

```
onRecordValidate((e) => {
  if (e.record.collection().name === "posts") {
    const title = e.record.get("title");
    if (!title || title.length < 5) {
      throw new ValidationError("title", "Title must be at least 5 characters");
    }
  }
  e.next();
});
```

> Always pass the collection filter (`"posts"`, `"users"`, etc.) to `onRecord*` hooks to avoid running them on every collection. [file:43]

---

## 5. Routing (Custom Endpoints)

### 5.1 Basic routes

```
// v0.23+ path params: {name}, not :name
routerAdd("GET", "/hello/{name}", (e) => {
  const name = e.request.pathValue("name");
  return e.json(200, { message: `Hello ${name}!` });
});

// POST route with body
routerAdd("POST", "/api/create", (e) => {
  const info = e.requestInfo();
  const body = info.body; // in v0.34.x, .body is the parsed body (if JSON)

  if (!body.title) {
    throw new BadRequestError("Title is required");
  }

  const posts = $app.findCollectionByNameOrId("posts");
  const record = new Record(posts);
  record.set("title", body.title);
  record.set("content", body.content || "");
  record.set("author", info.auth?.id); // requires auth middleware

  $app.save(record);

  return e.json(200, { id: record.id });
}, $apis.requireAuth());
```

> If needed, you can use `info.bodyAsText` plus `JSON.parse` for full control over decoding.

### 5.2 Middleware

```
// Require authentication
routerAdd("GET", "/protected", (e) => {
  return e.json(200, { userId: e.auth.id });
}, $apis.requireAuth());

// Require superuser/admin
routerAdd("GET", "/admin-only", (e) => {
  return e.json(200, { message: "Admin access" });
}, $apis.requireSuperuser());
```

### 5.3 Request info helpers

```
routerAdd("POST", "/api/endpoint", (e) => {
  const info = e.requestInfo();

  const body = info.body;  // v0.23+ body
  const title = body.title;

  const page = info.query.page || "1";             // query params
  const authHeader = info.headers["authorization"]; // headers
  const user = info.auth;                          // authenticated user (if any)

  return e.json(200, { received: true });
});
```

---

## 6. HTTP Requests (Calling External APIs)

```
routerAdd("GET", "/fetch-data", (e) => {
  const res = $http.send({
    url: "https://api.example.com/data",
    method: "GET",
    headers: {
      "Authorization": "Bearer TOKEN",
      "Content-Type": "application/json",
    },
  });

  if (res.statusCode !== 200) {
    throw new BadRequestError("API request failed");
  }

  const data = res.json;
  return e.json(200, data);
});

// POST request example
const res = $http.send({
  url: "https://api.example.com/create",
  method: "POST",
  body: JSON.stringify({ name: "Test" }),
  headers: { "Content-Type": "application/json" },
});
```

---

## 7. Utilities

### 7.1 Security helpers

```
// Random string
const token = $security.randomString(32);

// Random string with custom alphabet
const code = $security.randomStringWithAlphabet(6, "0123456789");

// Hash password
const hash = $security.hash("mypassword");

// Verify hash
const isValid = $security.hashCheck("mypassword", hash);
```

### 7.2 JWT helpers

```
// Parse JWT (without verification)
const claims = $security.parseUnverifiedJWT("TOKEN_STRING");

// Create JWT
const token = $security.createJWT(
  {
    userId: "123",
    exp: $security.timestamp() + 3600,
  },
  "SECRET_KEY"
);
```

### 7.3 Admin management (CLI)

Run inside the PocketBase container or on the server:

```
# Create admin user
/pb/pocketbase admin create admin@example.com "secure-password"

# Update admin password
/pb/pocketbase admin update admin@example.com "new-password"
```

---

## 8. Migration Quick Reference (v0.22 → v0.34.x)

| Task                | v0.22 (OLD)                         | v0.34.x (NEW)                                |
|---------------------|-------------------------------------|----------------------------------------------|
| Find record         | `$app.dao().findRecordById()`       | `$app.findRecordById()`                      |
| Save record         | `$app.dao().saveRecord(record)`     | `$app.save(record)`                          |
| Delete record       | `$app.dao().deleteRecord(record)`   | `$app.delete(record)`                        |
| Find collection     | `$app.dao().findCollectionByNameOrId()` | `$app.findCollectionByNameOrId()`        |
| Save collection     | `$app.dao().saveCollection()`       | `$app.save(collection)`                      |
| Hook pattern        | `onAfterBootstrap((e) => {})`       | `onBootstrap((e) => { e.next(); })`          |
| Route params        | `"/hello/:name"`                    | `"/hello/{name}"`                            |
| Request data        | `info.data`                         | `info.body`                                  |
| Collection schema   | `collection.schema`                 | `collection.fields`                          |

---

## 9. Best Practices

### 9.1 Always use `e.next()`

```
// ✅ Correct
onBootstrap((e) => {
  e.next();  // Always call this
  // Your code here
});

// ❌ Wrong – breaks execution chain
onBootstrap((e) => {
  console.log("This will cause issues"); // missing e.next()
});
```

### 9.2 Error handling

```
routerAdd("POST", "/api/create", (e) => {
  const info = e.requestInfo();

  if (!info.body.title) {
    throw new BadRequestError("Title is required");
  }

  try {
    const posts = $app.findCollectionByNameOrId("posts");
    const record = new Record(posts);
    record.set("title", info.body.title);
    $app.save(record);

    return e.json(200, { id: record.id });
  } catch (err) {
    throw new BadRequestError(`Failed to create: ${err.message}`);
  }
});
```

### 9.3 Type safety with `types.d.ts`

```
/// <reference path="../pb_data/types.d.ts" />

// PocketBase auto-generates types for:
// - $app, $http, $security, $apis
// - All your collections and fields
// This gives autocomplete and type hints in VS Code.
```

---

## 10. Quick Snippets

```
// Create record
const rec = new Record($app.findCollectionByNameOrId("COLLECTION"));
rec.set("fieldName", "value");
$app.save(rec);

// Update record
const rec2 = $app.findRecordById("COLLECTION", "ID");
rec2.set("fieldName", "newValue");
$app.save(rec2);

// Delete record
const rec3 = $app.findRecordById("COLLECTION", "ID");
$app.delete(rec3);

// Simple custom route
routerAdd("GET", "/api/hello", (e) => {
  return e.json(200, { message: "Hello!" });
});
```

---

**This guide covers effectively everything you need for PocketBase v0.34.2+ in your stack. Remember: no `dao()`, always `e.next()`, always filter hooks by collection, and never invent schema.**
```

