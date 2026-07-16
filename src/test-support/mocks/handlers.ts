/**
 * Development-only Tauri command facade.
 *
 * Feature mock modules own command behavior. This facade applies optional
 * test controls before dispatching through the explicit command registry.
 */

import { invokeRegisteredMockCommand } from "./commandRegistry";
import {
  clearMockInvokeControls,
  readMockInvokeControl,
  waitForMockDelay,
} from "./invokeControls";
import { resetMockState } from "./runtimeState";

export async function mockInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const control = readMockInvokeControl(command);
  await waitForMockDelay(control.delayMs);

  if (control.failureMessage) throw new Error(control.failureMessage);
  if (control.hasResponse) return control.responseValue as T;

  return invokeRegisteredMockCommand<T>(command, args);
}

export function resetMockData(): void {
  clearMockInvokeControls();
  resetMockState();
}
