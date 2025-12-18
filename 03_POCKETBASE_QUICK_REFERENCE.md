# 🚀 PocketBase v0.34.2+ – Quick Reference Card

One‑page cheat sheet for **daily development** with PocketBase v0.34.x in your AI‑First stack.

> For detailed explanations, see `02_POCKETBASE_0_3_4_API_REFERENCE.md`. [file:46]

---

## ⚡ Key Changes from v0.22

```
// ❌ v0.22 (OLD)
$app.dao().findRecordById()
$app.dao().saveRecord()

// ✅ v0.34.x (NEW)
$app.findRecordById()
$app.save()
```

**Remember:** No `dao()` in v0.34.x. Everything goes through `$app`. 🚫

---

## 📊 Common Operations

### Find records

```
// By ID
const record = $app.findRecordById("posts", "xyz");

// By filter
const first = $app.findFirstRecordByFilter("posts", "status = 'active'");

// Multiple with sort & limit
const records = $app.findRecordsByFilter(
  "posts",
  "user = 'abc'",
  "-created",
  10
);

// Count (all or with filter)
const total = $app.countRecords("posts");
const published = $app.countRecords("posts", "status = 'published'");
```

### Create / update records

```
// Create
const posts = $app.findCollectionByNameOrId("posts");
const record = new Record(posts);
record.set("title", "Hello");

// In routes/hooks with auth, use e.auth / info.auth:
record.set("author", e.auth.id);

$app.save(record);

// Update
const existing = $app.findRecordById("posts", "xyz");
existing.set("title", "Updated");
$app.save(existing);

// Increment / decrement
existing.set("views+", 1); // increment
existing.set("likes-", 1); // decrement
$app.save(existing);
```

### Delete records

```
const toDelete = $app.findRecordById("posts", "xyz");
$app.delete(toDelete);
```

---

## 🎣 Hooks (v0.34.x pattern)

> Always follow your global rules: call `e.next()`, and filter hooks by collection when using `onRecord*`. [file:43]

```
// ✅ Always use e.next()
onBootstrap((e) => {
  e.next();  // must be called
  console.log("App started");
});

// Record creation (for "posts" only)
onRecordBeforeCreateRequest((e) => {
  console.log("Creating:", e.record.get("title"));
  e.next();
}, "posts");

// After successful creation
onRecordAfterCreateSuccess((e) => {
  console.log("Created:", e.record.id);
}, "posts");
```

---

## 🌐 Routing

```
// ✅ v0.23+ param syntax: {param}
routerAdd("GET", "/hello/{name}", (e) => {
  const name = e.request.pathValue("name");
  return e.json(200, { message: `Hello ${name}!` });
});

// POST with JSON body
routerAdd("POST", "/api/create", (e) => {
  const info = e.requestInfo();
  const body = info.body; // v0.23+ uses .body, not .data

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

// With authentication (protected route)
routerAdd("GET", "/protected", (e) => {
  return e.json(200, { userId: e.auth.id });
}, $apis.requireAuth());
```

---

## 📁 Files

```
// Single file
record.set("avatar", $filesystem.fileFromPath("/path/to/file.jpg"));

// Multiple files
record.set("gallery", [
  $filesystem.fileFromPath("/path/to/img1.jpg"),
  $filesystem.fileFromPath("/path/to/img2.jpg"),
]);

// From upload
routerAdd("POST", "/upload", (e) => {
  const files = e.findUploadedFiles("file"); // form field "file"

  if (!files || files.length === 0) {
    throw new BadRequestError("No file uploaded");
  }

  const uploads = $app.findCollectionByNameOrId("uploads");
  const record = new Record(uploads);
  record.set("file", files);
  $app.save(record);

  return e.json(200, { success: true, id: record.id });
});
```

---

## 🔐 Security

```
// Random string
const token = $security.randomString(32);

// Hash password
const hash = $security.hash("password");

// Verify hash
const valid = $security.hashCheck("password", hash);
```

---

## 🌍 HTTP requests

```
const res = $http.send({
  url: "https://api.example.com/data",
  method: "GET",
  headers: { Authorization: "Bearer TOKEN" },
});

if (res.statusCode !== 200) {
  throw new BadRequestError("Request failed");
}

const data = res.json;
```

---

## 📝 Schema enforcer (v0.34.x – typed fields)

```
/// <reference path="../pb_data/types.d.ts" />

onBootstrap((e) => {
  e.next();

  const users = $app.findCollectionByNameOrId("users");

  let collection;
  try {
    collection = $app.findCollectionByNameOrId("posts");
  } catch (_) {
    collection = new Collection();
    collection.name = "posts";
    collection.type = "base";
  }

  collection.listRule = "@request.auth.id != \"\"";
  collection.createRule = "@request.auth.id != \"\"";

  // Clear non-system fields
  const existing = collection.fields.clone();
  for (const f of existing) {
    if (!f.system) collection.fields.removeById(f.id);
  }

  // Add typed fields (no SchemaField in v0.34.x)
  collection.fields.add(new TextField({
    name: "title",
    required: true,
    max: 200,
  }));

  collection.fields.add(new RelationField({
    name: "author",
    required: true,
    collectionId: users.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));

  $app.save(collection);
});
```

---

## 🔄 Quick migration table (v0.22 → v0.34.x)

| v0.22 (OLD)                        | v0.34.x (NEW)                    |
|------------------------------------|----------------------------------|
| `$app.dao().findRecordById()`      | `$app.findRecordById()`         |
| `$app.dao().saveRecord()`          | `$app.save()`                   |
| `$app.dao().deleteRecord()`        | `$app.delete()`                 |
| `"/hello/:name"`                   | `"/hello/{name}"`               |
| `info.data`                        | `info.body`                     |
| `onAfterBootstrap`                 | `onBootstrap` with `e.next()`   |
| `collection.schema`                | `collection.fields`             |

---

## ⚠️ Common mistakes

```
// ❌ Don't: forget e.next()
onBootstrap((e) => {
  console.log("Missing e.next()!");
});

// ✅ Do: always call e.next()
onBootstrap((e) => {
  e.next();
  console.log("Correct!");
});

// ❌ Don't: use old dao() syntax
$app.dao().saveRecord(record);

// ✅ Do: use direct $app calls
$app.save(record);
```

---

## 📚 Where the full v0.34.x docs live

Use these as your **external source of truth** for PocketBase v0.34.x:

- Main docs: https://pocketbase.io/docs/  
- Records API: https://pocketbase.io/docs/api-records/  
- Authentication: https://pocketbase.io/docs/authentication/  
- How to use (JS client patterns): https://pocketbase.io/docs/how-to-use/  
- JS SDK README: https://github.com/pocketbase/js-sdk  
- Changelog (0.34.x): https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md  

For deeper details, see `02_POCKETBASE_0_3_4_API_REFERENCE.md`.