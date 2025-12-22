/**
 * 🦅 AI-First Stack: PocketBase Client Template
 * 
 * This is the SINGLE SOURCE OF TRUTH for PocketBase connection.
 * 
 * Usage:
 *   import { pb, currentUser } from "@/lib/pocketbase";
 * 
 * @see https://pocketbase.io/docs/client-side-sdks/
 */

import PocketBase, { AuthRecord } from "pocketbase";

// --- Client Initialization ---

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

/**
 * Singleton PocketBase client instance.
 * Safe to import in both Server Components and Client Components.
 */
export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation to prevent request conflicts in React 18 Strict Mode.
pb.autoCancellation(false);

// --- Auth Helpers ---

/**
 * Returns the currently authenticated user, or null if not logged in.
 */
export function currentUser(): AuthRecord | null {
    return pb.authStore.isValid ? pb.authStore.record : null;
}

/**
 * Checks if a user is currently authenticated.
 */
export function isAuthenticated(): boolean {
    return pb.authStore.isValid;
}

/**
 * Logs out the current user and clears the auth store.
 */
export function logout(): void {
    pb.authStore.clear();
}

// --- Collection Helpers (Type-Safe) ---

/**
 * Type-safe wrapper for common collection operations.
 * Extend this with your specific collection types.
 * 
 * Example:
 *   const trips = await getCollection<Trip>("trips").getFullList();
 */
export function getCollection<T>(collectionName: string) {
    return pb.collection(collectionName) as ReturnType<typeof pb.collection>;
}

// --- SSR Auth Store (Next.js App Router) ---

/**
 * For Server Components: Load auth from cookies.
 * Call this in your layout.tsx or page.tsx server component.
 * 
 * Example:
 *   import { cookies } from "next/headers";
 *   loadAuthFromCookie(cookies().get("pb_auth")?.value);
 */
export function loadAuthFromCookie(cookieValue?: string): void {
    if (cookieValue) {
        pb.authStore.loadFromCookie(`pb_auth=${cookieValue}`);
    }
}

/**
 * For Client Components: Sync auth to cookies.
 * Call this after successful login to persist auth.
 */
export function syncAuthToCookie(): void {
    if (typeof document !== "undefined") {
        document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
    }
}
