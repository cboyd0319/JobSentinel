/**
 * Mock API for development without Tauri backend
 *
 * This module provides mock implementations of all Tauri commands,
 * allowing frontend development without running the Rust backend.
 *
 * Usage:
 *
 * 1. Automatic (in browser without Tauri):
 *    The mocking is automatically enabled when running `npm run dev`
 *    in a browser (not through `npm run tauri:dev`).
 *
 * 2. Force enable with environment variable:
 *    VITE_MOCK_API=true npm run dev
 *
 * 3. Manual setup in main.tsx:
 *    import { setupMocking } from "./mocks";
 *    await setupMocking();
 *
 * Features:
 * - Mock data for jobs, applications, interviews
 * - In-memory state that persists during session
 * - Simulated network latency for realistic testing
 * - Full CRUD operations for testing UI flows
 */

export { enableMocking, setupMocking, shouldEnableMocking } from "./browser";
export { mockInvoke, resetMockData } from "./handlers";
export * from "./data";
