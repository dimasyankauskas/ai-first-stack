# 🎨 Antigravity UI/UX Standards

> **Philosophy:** We do not build generic "dashboards." We build fluid, organic, and highly interactive "Antigravity" experiences.
> **Core Rule:** strict separation of Business Logic (Hooks) and Visual Presentation (Components).

---

## 1. Architecture: The "Logic Divorce"

To prevent "spaghetti code," you must strictly separate logic from UI.

### ❌ The Forbidden Pattern (Mixed Concerns)
```tsx
// NEVER DO THIS
export default function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('/api/user').then(...) // ❌ Logic inside UI
  }, []);

  return <div className="p-4 border rounded">...</div>; // ❌ Hardcoded styles
}

```

### ✅ The Antigravity Pattern (Separated)

**File 1: `hooks/useUserProfile.ts` (The Brain)**

```ts
export function useUserProfile() {
  // All state, effects, and data fetching go here
  // Returns ONLY data and handler functions
  return { user, isLoading, updateProfile };
}

```

**File 2: `components/UserProfile.tsx` (The Face)**

```tsx
import { useUserProfile } from "@/hooks/useUserProfile";

export default function UserProfile() {
  const { user, isLoading } = useUserProfile(); // ✅ Logic injected
  
  // Pure JSX - no complex calculations here
  return (
    <Card variant="glass">
      <Avatar src={user.avatar} size="lg" />
      <Text variant="h2">{user.name}</Text>
    </Card>
  );
}

```

---

## 2. Visual System: "No Generic Boxes"

Avoid the "Bootstrap Look" (flat gray backgrounds, standard 1px borders).

### 2.1 The Component Definition (`cva`)

Use `class-variance-authority` (CVA) for all core components to handle variants cleanly.

```tsx
// components/ui/card.tsx
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "relative overflow-hidden transition-all duration-300", // Base
  {
    variants: {
      variant: {
        default: "bg-white border border-slate-200 shadow-sm",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 shadow-xl", // ✨ Antigravity look
        neon: "bg-black border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
      },
      padding: {
        none: "p-0",
        md: "p-6",
        lg: "p-8",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

```

### 2.2 Layout Philosophy

* **Asymmetry:** Avoid perfect 12-column grids everywhere. Use standard grids for data, but asymmetric layouts for landing/marketing areas.
* **Whitespace:** Double the whitespace you think you need.
* **Fluidity:** Use `min-h-screen` and `flex-grow` to ensure footers never float awkwardly in the middle of the screen.

---

## 3. Micro-Interactions (The "Soul")

Static interfaces feel cheap. Every interactive element must provide feedback.

* **Hover:** `hover:scale-[1.02] active:scale-[0.98]` on cards/buttons.
* **Focus:** `focus-visible:ring-2 focus-visible:ring-offset-2` (Accessibility is mandatory).
* **Transition:** Always add `transition-all duration-200 ease-out` to interactive elements.

---

## 4. Typography & Hierarchy

* **No "Pure Black":** Never use `#000000`. Use `slate-900` or `zinc-900`.
* **Fluid Text:** Use `clamp()` or Tailwind's responsive prefixes (`text-xl md:text-3xl`) to ensure headers scale emotionally, not just technically.

---

## 5. Next.js App Router Specifics

* **Server Components:** Use them for *initial data fetching*.
* **Client Components:** Use them *only* at the leaves of the tree where interaction happens (forms, buttons).
---

## 6. Quick Reference: Pre-Flight Checklist

Before coding any UI component:

1. **Stack Check:** Next.js 16 / PB 0.34.2
2. **Architecture Plan:** "I will create `hooks/useX` for logic and `components/X` for UI."
3. **Design Prompt:** If unclear, ask: "What is the 'vibe'? (Cyberpunk, Minimalist, Glass, Corporate?)" or default to **Antigravity Minimalist**.

> **See also:** `@/ai-first-stack/core/00_PROTOCOL.md` for full execution protocol.
