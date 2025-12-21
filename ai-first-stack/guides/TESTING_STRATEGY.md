# 🧪 Testing Strategy Guide

Testing patterns for the AI-First Stack (Next.js 16 + PocketBase).

---

## 1. Test Types Overview

| Type | Tool | What to Test |
|------|------|--------------|
| **Unit** | Vitest | Hooks, utilities, schemas |
| **Integration** | Vitest + MSW | API calls, PocketBase mocks |
| **E2E** | Playwright | Full user flows |
| **Component** | Testing Library | UI components in isolation |

---

## 2. Setup

### 2.1 Install Dependencies

```bash
cd frontend

# Unit & Integration
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# API Mocking
npm install -D msw

# E2E
npm install -D @playwright/test
npx playwright install
```

### 2.2 Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2.3 Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 3. Unit Testing

### 3.1 Testing Hooks (Logic Divorce)

```typescript
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

### 3.2 Testing Zod Schemas

```typescript
// lib/schemas/user.test.ts
import { describe, it, expect } from 'vitest';
import { userSchema } from './user';

describe('userSchema', () => {
  it('validates valid user', () => {
    const result = userSchema.safeParse({
      id: '123',
      email: 'test@example.com',
      name: 'John Doe',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({
      id: '123',
      email: 'invalid',
      name: 'John',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z',
    });
    
    expect(result.success).toBe(false);
  });
});
```

---

## 4. Integration Testing (MSW)

### 4.1 Mock Server Setup

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock PocketBase auth
  http.post('*/api/collections/users/auth-with-password', () => {
    return HttpResponse.json({
      token: 'mock-token',
      record: { id: '123', email: 'test@example.com' },
    });
  }),

  // Mock posts list
  http.get('*/api/collections/posts/records', () => {
    return HttpResponse.json({
      items: [
        { id: '1', title: 'Test Post', content: 'Content' },
      ],
      totalItems: 1,
    });
  }),
];
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 4.2 Testing API Hooks

```typescript
// hooks/usePosts.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePosts } from './usePosts';

describe('usePosts', () => {
  it('fetches posts', async () => {
    const { result } = renderHook(() => usePosts());
    
    await waitFor(() => {
      expect(result.current.posts).toHaveLength(1);
    });
    
    expect(result.current.posts[0].title).toBe('Test Post');
  });
});
```

---

## 5. Component Testing

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## 6. E2E Testing (Playwright)

### 6.1 Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

### 6.2 E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });
});
```

---

## 7. npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 8. CI Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test -- --run
      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e
```

---

## 9. What to Test

| Layer | Test | Priority |
|-------|------|----------|
| **Hooks** | State logic, API calls | High |
| **Schemas** | Zod validation | High |
| **Server Actions** | Input validation, errors | Medium |
| **Components** | User interactions | Medium |
| **E2E** | Critical user flows only | Low (expensive) |

---

**See also:**
- [ZOD_VALIDATION.md](../reference/ZOD_VALIDATION.md) - Schema testing
- [UI_UX_STANDARDS.md](../reference/UI_UX_STANDARDS.md) - Component patterns
