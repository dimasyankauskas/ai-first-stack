# 🤖 Gemini Integration Guide

Patterns for integrating **Google Gemini** models into your AI-First Stack.

> **Primary Use:** All AI features in this stack use Gemini as the default model provider.

---

## 1. Setup

### 1.1 Environment Variables

Add to `.env` and Dokploy environment:

```bash
# Gemini API Key (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=AIzaSy...

# Optional: Model configuration
GEMINI_MODEL=gemini-2.0-flash-exp
```

### 1.2 PocketBase Hook Access

In your PocketBase hooks, access via environment:

```javascript
// pb_hooks/ai.pb.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
```

---

## 2. API Patterns

### 2.1 Basic Text Generation (PocketBase Hook)

```javascript
// pb_hooks/ai.pb.js

routerAdd("POST", "/api/ai/generate", (e) => {
  const info = e.requestInfo();
  const { prompt, systemPrompt } = info.body;

  if (!prompt) {
    throw new BadRequestError("Prompt is required");
  }

  const response = $http.send({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (response.statusCode !== 200) {
    console.error("Gemini API error:", response.raw);
    throw new BadRequestError("AI generation failed");
  }

  const result = response.json;
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return e.json(200, { text });
}, $apis.requireAuth());
```

### 2.2 Structured Output (JSON Mode)

```javascript
// Force JSON response from Gemini
const response = $http.send({
  url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary"],
      },
    },
  }),
});

const data = JSON.parse(response.json.candidates[0].content.parts[0].text);
```

---

## 3. Frontend Integration

### 3.1 Hook Pattern (Logic Divorce)

```typescript
// hooks/useAI.ts
import { useState } from 'react';
import pb from '@/lib/pocketbase';

interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async ({ prompt, systemPrompt }: GenerateOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${pb.baseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token || '',
        },
        body: JSON.stringify({ prompt, systemPrompt }),
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      return data.text;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
```

### 3.2 Component Usage

```tsx
// components/AIChat.tsx
'use client';

import { useAI } from '@/hooks/useAI';

export function AIChat() {
  const { generate, loading, error } = useAI();
  const [response, setResponse] = useState('');

  const handleSubmit = async (prompt: string) => {
    const text = await generate({ 
      prompt,
      systemPrompt: 'You are a helpful assistant.'
    });
    setResponse(text);
  };

  return (
    // UI only - no business logic here
  );
}
```

---

## 4. Cost Optimization

### 4.1 Model Selection

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| `gemini-2.0-flash-exp` | Fast | Low | Real-time chat, quick tasks |
| `gemini-1.5-pro` | Medium | Medium | Complex reasoning, long context |
| `gemini-1.5-flash` | Fast | Low | Balanced performance |

### 4.2 Token Management

```javascript
// Limit output tokens for cost control
generationConfig: {
  maxOutputTokens: 1024,  // Adjust based on use case
  temperature: 0.7,       // Lower = more deterministic
}
```

### 4.3 Caching Responses

```javascript
// Check cache before calling API
const cacheKey = $security.hash(prompt);
const cached = $app.findFirstRecordByFilter("ai_cache", `key = '${cacheKey}'`);

if (cached) {
  return e.json(200, { text: cached.get("response"), cached: true });
}

// ... make API call ...

// Cache the response
const cacheRecord = new Record($app.findCollectionByNameOrId("ai_cache"));
cacheRecord.set("key", cacheKey);
cacheRecord.set("response", text);
$app.save(cacheRecord);
```

---

## 5. Error Handling

### 5.1 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 Bad Request | Invalid prompt/config | Check request body format |
| 403 Forbidden | Invalid API key | Verify `GEMINI_API_KEY` |
| 429 Too Many Requests | Rate limited | Implement backoff/retry |
| 500 Server Error | Gemini service issue | Retry or fallback |

### 5.2 Retry Pattern

```javascript
const callWithRetry = (fn, retries = 3, delay = 1000) => {
  try {
    return fn();
  } catch (err) {
    if (retries > 0 && err.message.includes("429")) {
      // Exponential backoff
      const sleepMs = delay * (4 - retries);
      // Note: PocketBase doesn't have sleep, use setTimeout alternative
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
};
```

---

## 6. Security

> ⚠️ **Never expose API keys to the frontend.**

- ✅ Keep `GEMINI_API_KEY` in PocketBase environment only
- ✅ Call AI via authenticated PocketBase routes
- ✅ Validate/sanitize all user prompts
- ❌ Never call Gemini API directly from browser

---

## 7. Quick Reference

```javascript
// Minimal working example
routerAdd("POST", "/api/ai/ask", (e) => {
  const { question } = e.requestInfo().body;
  
  const res = $http.send({
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: question }] }],
    }),
  });

  const answer = res.json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return e.json(200, { answer });
}, $apis.requireAuth());
```

---

**See also:**
- [POCKETBASE_API.md](./POCKETBASE_API.md) - Hook patterns
- [RULES.md](../core/RULES.md) - Red Zone safety
- [Google AI Studio](https://aistudio.google.com/) - API key & testing
