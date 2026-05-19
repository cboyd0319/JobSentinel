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
import { mockIPC } from "@tauri-apps/api/mocks";

let mockingEnabled = false;

type WindowWithTauriInternals = Window & {
  __TAURI_INTERNALS__?: {
    invoke?: unknown;
    transformCallback?: unknown;
  };
};

function hasCompleteTauriInternals(): boolean {
  const internals = (window as WindowWithTauriInternals).__TAURI_INTERNALS__;
  return (
    typeof internals?.invoke === "function" &&
    typeof internals?.transformCallback === "function"
  );
}

/**
 * Enable API mocking by patching the Tauri invoke function
 */
export async function enableMocking(): Promise<void> {
  if (mockingEnabled) {
    return;
  }

  const forceMocking = import.meta.env.VITE_MOCK_API === "true";

  if (!forceMocking && hasCompleteTauriInternals()) {
    return;
  }

  mockIPC((cmd, args) => mockInvoke(cmd, args as Record<string, unknown>), {
    shouldMockEvents: true,
  });

  mockingEnabled = true;
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
  if (!hasCompleteTauriInternals() && import.meta.env.DEV) {
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
