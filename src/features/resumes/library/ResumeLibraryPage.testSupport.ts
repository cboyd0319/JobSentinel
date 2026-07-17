import { vi } from "vitest";
import { safeInvoke, safeInvokeWithToast } from "../../../platform/tauri";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
export const mockToast = toastMocks;

vi.mock("../../../platform/tauri", () => ({
  safeInvoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => toastMocks,
}));

export const mockSafeInvoke = vi.mocked(safeInvoke);
export const mockSafeInvokeWithToast = vi.mocked(safeInvokeWithToast);

export function resetResumeLibraryMocks() {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
}

export function makeResumeSummary(
  overrides: Partial<{
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    format_label: string;
    has_readable_text: boolean;
    readable_text_chars: number;
  }> = {},
) {
  return {
    id: 1,
    name: "Care Coordinator Resume",
    is_active: true,
    created_at: "2026-05-21T12:00:00Z",
    updated_at: "2026-05-21T12:00:00Z",
    ...overrides,
  };
}

export function makeUserSkill(
  overrides: Partial<{
    id: number;
    resume_id: number;
    skill_name: string;
    skill_category: string | null;
    confidence_score: number;
    years_experience: number | null;
    proficiency_level: string;
    source: string;
  }> = {},
) {
  return {
    id: 1,
    resume_id: 1,
    skill_name: "Patient Scheduling",
    skill_category: "Customer or Patient Support",
    confidence_score: 1,
    years_experience: 3,
    proficiency_level: "Regular use",
    source: "manual",
    ...overrides,
  };
}

export function mockResumeLibraryResponses(
  responses: Record<string, unknown> = {},
) {
  mockSafeInvoke.mockImplementation((command: string) => {
    if (Object.prototype.hasOwnProperty.call(responses, command)) {
      return Promise.resolve(responses[command]);
    }
    if (
      command === "list_all_resumes" ||
      command === "get_user_skills" ||
      command === "get_recent_matches"
    ) {
      return Promise.resolve([]);
    }
    return Promise.resolve(null);
  });
}
