# ✅ Zod Validation Guide

Data validation patterns using **Zod** for the AI-First Stack.

> **Logic Divorce:** All validation schemas live in `/lib/schemas/` or `/hooks/`, never in components.

---

## 1. Setup

```bash
npm install zod
```

---

## 2. Schema Patterns

### 2.1 Basic Schemas

```typescript
// lib/schemas/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email"),
  name: z.string().min(2, "Name too short").max(50),
  role: z.enum(["user", "admin", "moderator"]),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;
```

### 2.2 Form Validation

```typescript
// lib/schemas/forms.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name is required"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

### 2.3 API Response Validation

```typescript
// lib/schemas/api.ts
import { z } from 'zod';

// Validate PocketBase record responses
export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.string(), // relation ID
  created: z.string(),
  updated: z.string(),
});

export const postsListSchema = z.array(postSchema);

// Gemini AI response
export const aiResponseSchema = z.object({
  text: z.string(),
  cached: z.boolean().optional(),
});
```

---

## 3. Hook Integration

### 3.1 Form Hook with Validation

```typescript
// hooks/useLoginForm.ts
import { useState } from 'react';
import { loginSchema, LoginInput } from '@/lib/schemas/forms';
import pb from '@/lib/pocketbase';

export function useLoginForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (data: unknown): data is LoginInput => {
    const result = loginSchema.safeParse(data);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const submit = async (formData: FormData) => {
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    if (!validate(data)) return;

    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(data.email, data.password);
    } catch (err) {
      setErrors({ form: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return { submit, errors, loading, validate };
}
```

### 3.2 API Response Validation Hook

```typescript
// hooks/usePosts.ts
import { useState, useEffect } from 'react';
import { postsListSchema } from '@/lib/schemas/api';
import pb from '@/lib/pocketbase';

export function usePosts() {
  const [posts, setPosts] = useState<z.infer<typeof postsListSchema>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const records = await pb.collection('posts').getFullList();
        
        // Validate API response
        const result = postsListSchema.safeParse(records);
        
        if (!result.success) {
          console.error('Invalid API response:', result.error);
          setError('Data validation failed');
          return;
        }
        
        setPosts(result.data);
      } catch (err) {
        setError('Failed to fetch posts');
      }
    };

    fetchPosts();
  }, []);

  return { posts, error };
}
```

---

## 4. Server Actions

```typescript
// app/actions/createPost.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(20, "Content must be at least 20 characters"),
});

export async function createPost(formData: FormData) {
  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
  };

  // Validate input
  const result = createPostSchema.safeParse(rawData);
  
  if (!result.success) {
    return { 
      success: false, 
      errors: result.error.flatten().fieldErrors 
    };
  }

  // Safe to use validated data
  const { title, content } = result.data;
  
  // Call PocketBase...
  
  revalidatePath('/posts');
  return { success: true };
}
```

---

## 5. Common Patterns

### 5.1 Optional with Defaults

```typescript
const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  notifications: z.boolean().default(true),
  language: z.string().optional(),
});
```

### 5.2 Transform Data

```typescript
const priceSchema = z.string()
  .transform((val) => parseFloat(val))
  .refine((val) => !isNaN(val), "Invalid number");
```

### 5.3 Partial Updates

```typescript
const userUpdateSchema = userSchema.partial().omit({ id: true, createdAt: true });
// All fields optional except id and createdAt are removed
```

### 5.4 Discriminated Unions

```typescript
const notificationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("email"), email: z.string().email() }),
  z.object({ type: z.literal("sms"), phone: z.string() }),
  z.object({ type: z.literal("push"), deviceId: z.string() }),
]);
```

---

## 6. Error Display Component

```tsx
// components/FormError.tsx
interface FormErrorProps {
  error?: string;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;
  
  return (
    <p className="text-sm text-red-500 mt-1">{error}</p>
  );
}
```

---

## 7. Quick Reference

```typescript
// String validations
z.string().min(1).max(100).email().url().uuid().regex(/pattern/)

// Number validations  
z.number().min(0).max(100).int().positive().negative()

// Array validations
z.array(z.string()).min(1).max(10).nonempty()

// Object validations
z.object({}).strict().passthrough().partial().required()

// Enums
z.enum(["a", "b", "c"])
z.nativeEnum(MyEnum)

// Comparisons
.refine(val => val > 0, "Must be positive")
.transform(val => val.trim())
```

---

**See also:**
- [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md) - Logic Divorce pattern
- [RULES.md](../core/RULES.md) - Validation requirements
- [Zod Docs](https://zod.dev/) - Full API reference
