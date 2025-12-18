# 🚀 PocketBase v0.34.2 - Quick Reference Card

**One-page cheat sheet for daily development**

---

## ⚡ Key Changes from v0.22

```javascript
// ❌ v0.22 (OLD)
$app.dao().findRecordById()
$app.dao().saveRecord()

// ✅ v0.23 (NEW)
$app.findRecordById()
$app.save()
```

**Remember:** NO `dao()` in v0.23! 🚫

---

## 📊 Common Operations

### Find Records
```javascript
// By ID
const record = $app.findRecordById("posts", "xyz");

// By filter
const record = $app.findFirstRecordByFilter("posts", "status = 'active'");

// Multiple with sort & limit
const records = $app.findRecordsByFilter("posts", "user = 'abc'", "-created", 10);

// Count
const count = $app.countRecords("posts");
```

### Create/Update Records
```javascript
// Create
const collection = $app.findCollectionByNameOrId("posts");
const record = new Record(collection);
record.set("title", "Hello");
record.set("author", $app.authRecord().id);
$app.save(record);

// Update
const record = $app.findRecordById("posts", "xyz");
record.set("title", "Updated");
$app.save(record);

// Increment/Decrement
record.set("views+", 1);  // Increment
record.set("likes-", 1);  // Decrement
$app.save(record);
```

### Delete Records
```javascript
const record = $app.findRecordById("posts", "xyz");
$app.delete(record);
```

---

## 🎣 Hooks (v0.23 Pattern)

```javascript
// ✅ Always use e.next()
onBootstrap((e) => {
    e.next();  // Run after bootstrap
    console.log("App started");
});

// Record creation
onRecordCreate((e) => {
    console.log("Creating:", e.record.get("title"));
    e.next();
});

// After successful creation
onRecordAfterCreateSuccess((e) => {
    console.log("Created:", e.record.id);
});
```

---

## 🌐 Routing

```javascript
// ✅ v0.23: {param} syntax
routerAdd("GET", "/hello/{name}", (e) => {
    const name = e.request.pathValue("name");
    return e.json(200, { message: `Hello ${name}!` });
});

// POST with body
routerAdd("POST", "/api/create", (e) => {
    const info = e.requestInfo();
    const body = info.body;  // v0.23: .body (not .data!)
    
    const record = new Record($app.findCollectionByNameOrId("posts"));
    record.set("title", body.title);
    $app.save(record);
    
    return e.json(200, { id: record.id });
});

// With authentication
routerAdd("GET", "/protected", (e) => {
    return e.json(200, { user: e.auth.id });
}, $apis.requireAuth());
```

---

## 📁 Files

```javascript
// Single file
record.set("avatar", $filesystem.fileFromPath("/path/to/file.jpg"));

// Multiple files
record.set("gallery", [
    $filesystem.fileFromPath("/path/to/img1.jpg"),
    $filesystem.fileFromPath("/path/to/img2.jpg")
]);

// From upload
routerAdd("POST", "/upload", (e) => {
    const files = e.findUploadedFiles("file");
    record.set("file", files[0]);
    $app.save(record);
    return e.json(200, { success: true });
});
```

---

## 🔐 Security

```javascript
// Random string
const token = $security.randomString(32);

// Hash password
const hash = $security.hash("password");

// Verify hash
const valid = $security.hashCheck("password", hash);
```

---

## 🌍 HTTP Requests

```javascript
const res = $http.send({
    url: "https://api.example.com/data",
    method: "GET",
    headers: { "Authorization": "Bearer TOKEN" }
});

const data = res.json;
```

---

## 📝 Schema Enforcer Template

```javascript
onBootstrap((e) => {
    e.next();
    
    const users = $app.findCollectionByNameOrId("users");
    
    let collection;
    try {
        collection = $app.findCollectionByNameOrId("posts");
    } catch (e) {
        collection = new Collection();
        collection.name = "posts";
        collection.type = "base";
    }
    
    collection.listRule = "@request.auth.id != \"\"";
    collection.createRule = "@request.auth.id != \"\"";
    
    collection.schema.addField(new SchemaField({
        name: "title",
        type: "text",
        required: true
    }));
    
    $app.save(collection);
});
```

---

## 🔄 Quick Migration Table

| v0.22 | v0.23 |
|-------|-------|
| `$app.dao().findRecordById()` | `$app.findRecordById()` |
| `$app.dao().saveRecord()` | `$app.save()` |
| `$app.dao().deleteRecord()` | `$app.delete()` |
| `"/hello/:name"` | `"/hello/{name}"` |
| `info.data` | `info.body` |
| `onAfterBootstrap` | `onBootstrap` with `e.next()` |

---

## ⚠️ Common Mistakes

```javascript
// ❌ DON'T: Forget e.next()
onBootstrap((e) => {
    console.log("Missing e.next()!");
});

// ✅ DO: Always call e.next()
onBootstrap((e) => {
    e.next();
    console.log("Correct!");
});

// ❌ DON'T: Use old dao() syntax
$app.dao().saveRecord(record);

// ✅ DO: Direct $app calls
$app.save(record);
```

Where the most detailed 0.34.x docs actually live
Use these as your “source of truth” for 0.34.x (0.34.2 is current):​

Main docs (all features, 0.34.x):

https://pocketbase.io/docs/ → navigation on the left: Getting started, How to use, Records API, Auth, Rules, JS console, etc.​

Records API (your 400s, filters, sort, expand):

https://pocketbase.io/docs/api-records/ — full REST reference with payloads, filters, sort syntax, and examples.​

Authentication / authStore (for your client code in Cursor):

https://pocketbase.io/docs/authentication/ — explains tokens, auth collections, and how authWithPassword, authRefresh, etc. work.​

“How to use” with JS client patterns:

https://pocketbase.io/docs/how-to-use/ — global PocketBase client, auth store persistence, typical CRUD flows.​

JavaScript SDK full README (very detailed, often more concrete than the site):

https://github.com/pocketbase/js-sdk — install, usage, beforeSend/afterSend, all pb.collection(...).method(...) signatures.​

Changelog for 0.34.0–0.34.2 (to check for breaking changes / gotchas):

https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md plus activity around 0.34.x.​

---

**For full details:** [POCKETBASE_V023_API_REFERENCE.md](./POCKETBASE_V023_API_REFERENCE.md)
