const MOCK_INVOKE_CONTROLS_KEY = "jobsentinel.mockInvokeControls.v1";
const MAX_MOCK_DELAY_MS = 30_000;

interface MockInvokeControls {
  delayMs?: unknown;
  delays?: Record<string, unknown>;
  failures?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}

export interface MockInvokeControl {
  delayMs: number;
  failureMessage: string | null;
  hasResponse: boolean;
  responseValue: unknown;
}

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function getCommandControlEntry(
  controls: Record<string, unknown> | undefined,
  command: string,
): { found: boolean; value: unknown } {
  if (!controls) return { found: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(controls, command)) {
    return { found: true, value: controls[command] };
  }
  if (Object.prototype.hasOwnProperty.call(controls, "*")) {
    return { found: true, value: controls["*"] };
  }
  return { found: false, value: undefined };
}

function parseDelayMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(MAX_MOCK_DELAY_MS, Math.max(0, value));
}

function parseFailureMessage(value: unknown): string | null {
  if (value === true) return "Forced mock command failure";
  if (typeof value === "string" && value.trim()) return value.trim();
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }
  return null;
}

export function readMockInvokeControl(command: string): MockInvokeControl {
  const defaultDelayMs = 100 + Math.random() * 200;
  const defaultControl = {
    delayMs: defaultDelayMs,
    failureMessage: null,
    hasResponse: false,
    responseValue: undefined,
  };
  if (!canUseStorage()) return defaultControl;

  const rawControls = window.localStorage.getItem(MOCK_INVOKE_CONTROLS_KEY);
  if (!rawControls) return defaultControl;

  try {
    const controls = JSON.parse(rawControls) as MockInvokeControls;
    const commandDelay = parseDelayMs(
      getCommandControlEntry(controls.delays, command).value,
    );
    const globalDelay = parseDelayMs(controls.delayMs);
    const failureMessage = parseFailureMessage(
      getCommandControlEntry(controls.failures, command).value,
    );
    const response = getCommandControlEntry(controls.responses, command);

    return {
      delayMs: commandDelay ?? globalDelay ?? defaultDelayMs,
      failureMessage,
      hasResponse: response.found,
      responseValue: response.value,
    };
  } catch {
    window.localStorage.removeItem(MOCK_INVOKE_CONTROLS_KEY);
    return defaultControl;
  }
}

export function waitForMockDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function clearMockInvokeControls(): void {
  if (canUseStorage()) {
    window.localStorage.removeItem(MOCK_INVOKE_CONTROLS_KEY);
  }
}
