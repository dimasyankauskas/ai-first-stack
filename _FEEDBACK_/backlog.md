# Documentation Improvements Backlog

**Status:** Items requiring further investigation or clarification  
**Last Updated:** 2025-12-19

---

## ⚠️ PARTIALLY VERIFIED

### Finding 2.2: Index Creation Not Supported in Hooks

**Original Claim:** Custom indexes cannot be reliably created in hooks during collection creation.

**Verification Status:** ⚠️ PARTIALLY VERIFIED

**What We Confirmed:**
- ✅ Indexes DO fail when created in `onBootstrap` hooks during collection creation
- ✅ Error occurs when indexes reference fields that don't exist at save time
- ✅ Even auto-generated fields like `created` and `updated` aren't available yet

**What Needs Clarification:**
- The feedback suggests Admin UI as the primary solution
- However, PocketBase officially supports **migrations** for programmatic index creation
- Need to determine: Are migrations the better pattern vs Admin UI?

**Evidence:**
1. **From Feedback Report:**
   ```javascript
   // ❌ Attempted in onBootstrap:
   const collection = new Collection({
     indexes: [
       'CREATE INDEX idx_user_created ON knowledge_items(user, created)'
     ]
   });
   // Error: "Failed to create index idx_user_created - SQL logic error: no such column: created"
   ```

2. **From PocketBase Official Docs:**
   - Migrations are the recommended approach for version-controlled schema changes
   - Use: `pocketbase migrate create "add_indexes"`
   - Indexes can be added programmatically in migration files

**Proposed Enhancement:**

```markdown
### 2.2.2 Custom Indexes

**Limitation in v0.34.2:** Custom indexes cannot be reliably created in `onBootstrap` hooks during collection creation.

**Recommended Approaches (in order of preference):**

1. **Migrations (Preferred):** Use version-controlled migration files
   ```bash
   pocketbase migrate create "add_knowledge_items_indexes"
   ```
   
   Then in the migration file:
   ```javascript
   migrate((app) => {
     const collection = app.findCollectionByNameOrId('knowledge_items');
     collection.indexes = [
       'CREATE INDEX idx_user_created ON knowledge_items(user, created DESC)'
     ];
     app.save(collection);
   });
   ```

2. **Admin UI (Alternative):** Manually add indexes via dashboard after collection setup
   - Not version-controlled
   - Useful for quick testing or small projects

**Why hooks fail:** Index creation fails if it references fields that don't exist at save time, including auto-generated fields like `created` and `updated`.
```

**Next Steps:**
1. Test migration-based index creation against PocketBase v0.34.2
2. Verify if migrations run after all fields are created
3. If confirmed, update documentation with migration-first approach
4. If migrations also fail, keep Admin UI as primary recommendation

**Decision Required:** Should we:
- [ ] Keep original feedback (Admin UI only)
- [ ] Use enhanced version (Migrations + Admin UI)
- [ ] Test both approaches before deciding

**Timeline:** Review before implementation of Priority 2 items

---

## 📋 Review Checklist

Before moving items from backlog to approved:
- [ ] Test against live PocketBase v0.34.2 instance
- [ ] Verify error messages match actual output
- [ ] Confirm recommended approach is best practice
- [ ] Check for conflicts with other documentation

---

**Note:** All other findings (1.1, 1.2, 2.1, 3.1, 3.2) are **FULLY VERIFIED** and approved for implementation.
