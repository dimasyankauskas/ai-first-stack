# Bruber iPhone Shortcut Setup Guide

## Prerequisites

- iPhone 16 with iOS 18+
- Shortcuts app (pre-installed)
- Your Bruber user ID: `r4754cavs3xi207`

---

## Quick Setup

### Step 1: Open Shortcuts App

1. Open the **Shortcuts** app on your iPhone
2. Tap the **+** button (top right) to create a new shortcut

---

### Step 2: Add Actions

Add these actions in order:

#### Action 1: Get Latest Screenshot
- Search for **"Get Latest Photos"**
- Add it and set:
  - **Include:** Screenshots
  - **Limit:** 1 photo

#### Action 2: Upload to Bruber
- Search for **"Get Contents of URL"**
- Add it and configure:

| Setting | Value |
|---------|-------|
| **URL** | `https://m4s0gcooc848wk880040skcw.bruber.app/api/upload?user=r4754cavs3xi207&category=undefined&token=r4754cavs3xi207` |
| **Method** | POST |
| **Request Body** | Form |

Then tap **"Add new field"** → **File**:
- **Key:** `screenshot`
- **Value:** Select the **Photos** variable from Action 1

---

### Step 3: Show Result (Optional)
- Search for **"Show Notification"** or **"Show Result"**
- This will show you the response (fare amount, success/error)

---

### Step 4: Name Your Shortcut
- Tap the shortcut name at the top
- Name it: **"Bruber Upload"** or **"Upload Trip"**

---

## Complete Shortcut Flow

```
┌─────────────────────────────────┐
│  1. Get Latest Screenshot       │
│     (from Photos)               │
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│  2. Get Contents of URL         │
│     POST to /api/upload         │
│     with screenshot as Form     │
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│  3. Show Result                 │
│     (fare or error message)     │
└─────────────────────────────────┘
```

---

## URL Parameters Explained

| Parameter | Value | Description |
|-----------|-------|-------------|
| `user` | `r4754cavs3xi207` | Your Bruber user ID |
| `category` | `undefined`, `accepted`, or `declined` | Trip category |
| `token` | Same as user ID | Authentication token |

---

## Advanced: Three Shortcuts for Categories

You can create three shortcuts with different categories:

### 1. Upload Accepted Trip
```
.../api/upload?user=r4754cavs3xi207&category=accepted&token=r4754cavs3xi207
```

### 2. Upload Declined Trip  
```
.../api/upload?user=r4754cavs3xi207&category=declined&token=r4754cavs3xi207
```

### 3. Upload Uncategorized Trip
```
.../api/upload?user=r4754cavs3xi207&category=undefined&token=r4754cavs3xi207
```

---

## Add to Home Screen

1. Open your shortcut
2. Tap the **ⓘ** info button (bottom)
3. Tap **"Add to Home Screen"**
4. Choose an icon and color
5. Tap **Add**

Now you can one-tap upload from your home screen!

---

## Using with Share Sheet

To upload any screenshot (not just the latest):

1. Edit your shortcut
2. Tap the **ⓘ** info button
3. Enable **"Show in Share Sheet"**
4. Set **"Receives"** to **Images**

Now you can:
1. Open any screenshot in Photos
2. Tap **Share** → **Bruber Upload**

---

## Expected Responses

### ✅ Success
```json
{
  "success": true,
  "tripId": "abc123",
  "category": "accepted", 
  "fare": 65.83
}
```

### ❌ Not a Valid Screenshot
```json
{
  "success": false,
  "error": "Not a valid trip screenshot. Please capture an Uber/Lyft ride offer."
}
```

### ❌ File Too Large
```json
{
  "success": false,
  "error": "File too large. Maximum size is 5MB."
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing user parameter" | Check the URL has `?user=your_id` |
| "Invalid token" | Make sure `token` equals `user` |
| No response | Check internet connection |
| Wrong photo uploaded | Use "Select Photos" instead of "Get Latest" |

---

## Pro Tips

1. **Take screenshot → Run shortcut** - One quick workflow
2. **Use Back Tap** - Settings → Accessibility → Touch → Back Tap → Set to run Bruber shortcut
3. **Use Siri** - "Hey Siri, upload trip" after naming your shortcut

---

*Happy trip logging! 🚗💰*
