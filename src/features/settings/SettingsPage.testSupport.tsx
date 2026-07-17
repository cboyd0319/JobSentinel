import { vi } from "vitest";
import { invoke } from "../../platform/tauri";
import { resetBodyScrollLocksForTests } from "../../ui/bodyScrollLock";
import {
  downloadPrivateSettingsBackup,
  selectSettingsBackupFile,
} from "./support/settingsBackupFile";
import {
  makeConfig,
  makeGhostConfig,
} from "./SettingsPage.testFixtures";

export {
  makeConfig,
  makeGhostConfig,
  makeSavedSearch,
} from "./SettingsPage.testFixtures";

export const mockInvoke = vi.mocked(invoke);
export const mockDownloadPrivateSettingsBackup = vi.mocked(
  downloadPrivateSettingsBackup,
);
export const mockSelectSettingsBackupFile = vi.mocked(selectSettingsBackupFile);

// Mock toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("../../shared/errorReporting/messages", () => ({
  getUserFriendlyError: (err: unknown) => ({
    title: "Error",
    message: String(err),
  }),
}));

vi.mock("./support/settingsBackupFile", () => ({
  downloadPrivateSettingsBackup: vi.fn(),
  selectSettingsBackupFile: vi.fn(),
}));

vi.mock("./support/ErrorLogPanel", () => ({
  ErrorLogPanel: () => <div data-testid="error-log-panel" />,
}));

// Wire up mockInvoke to handle the happy path
export function setupHappyPath() {
  mockInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === "get_config") return makeConfig();
    if (cmd === "get_credential_status") return [];
    if (cmd === "get_credential_unlock_status") {
      return { mode: "system", configured: false, unlocked: true };
    }
    if (cmd === "has_credential") return false;
    if (cmd === "get_ghost_config") return makeGhostConfig();
    if (cmd === "detect_location") return null;
    if (cmd === "list_cover_letter_templates") return [];
    if (cmd === "list_saved_searches") return [];
    if (cmd === "import_cover_letter_templates") return 0;
    if (cmd === "import_saved_searches") return 0;
    return null;
  });
}

export function resetSettingsLoadTest() {
  vi.clearAllMocks();
  resetBodyScrollLocksForTests();
  window.sessionStorage.clear?.();
}

export function cleanupSettingsLoadTest() {
  resetBodyScrollLocksForTests();
}
