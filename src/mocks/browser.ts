/**
 * Browser mock setup for development without Tauri backend
 *
 * Usage:
 *   import { enableMocking } from "./mocks/browser";
 *   await enableMocking();
 *
 * Or set VITE_MOCK_API=true in environment
 */

import { mockInvoke } from "./handlers";

let mockingEnabled = false;

/**
 * Enable API mocking by patching the Tauri invoke function
 */
export async function enableMocking(): Promise<void> {
  if (mockingEnabled) {
    console.log("[Mock] Mocking already enabled");
    return;
  }

  // Check if we're in a Tauri environment
  const isTauri = "__TAURI__" in window || "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    console.log("[Mock] Running in Tauri environment - mocking disabled");
    return;
  }

  // Patch the global invoke function
  // @ts-expect-error - Patching global for mocking
  window.__TAURI_INTERNALS__ = {
    invoke: mockInvoke,
  };

  // Also patch the @tauri-apps/api/core module if it's loaded
  try {
    const tauriCore = await import("@tauri-apps/api/core");
    // @ts-expect-error - Patching for mocking
    tauriCore.invoke = mockInvoke;
  } catch {
    // Module not loaded yet, that's fine
  }

  mockingEnabled = true;
  console.log("[Mock] API mocking enabled - using mock data");
  console.log("[Mock] Mock data includes 5 jobs, applications, interviews");
}

/**
 * Check if mocking should be enabled based on environment
 */
export function shouldEnableMocking(): boolean {
  // Check environment variable
  if (import.meta.env.VITE_MOCK_API === "true") {
    return true;
  }

  // Check if running in browser without Tauri
  const isTauri = "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
  if (!isTauri && import.meta.env.DEV) {
    return true;
  }

  return false;
}

/**
 * Conditional mocking setup - call this in main.tsx
 */
export async function setupMocking(): Promise<void> {
  if (shouldEnableMocking()) {
    await enableMocking();
  }
}
