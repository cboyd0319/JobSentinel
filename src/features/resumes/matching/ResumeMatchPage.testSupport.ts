import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  read: vi.fn(() => null),
  remove: vi.fn(() => true),
  write: vi.fn(() => true),
}));
export const mockReadStorageValue = storageMocks.read;
export const mockRemoveStorageValue = storageMocks.remove;
export const mockWriteStorageValue = storageMocks.write;

vi.mock("../../../shared/browserStorage", () => ({
  readStorageValue: mockReadStorageValue,
  removeStorageValue: mockRemoveStorageValue,
  writeStorageValue: mockWriteStorageValue,
}));

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

export const mockInvoke = vi.mocked(invoke);

export const validResume = {
  resume: {
    personal: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "555-1234",
      location: "Denver, CO",
      linkedin: null,
      github: null,
      website: null,
    },
    summary: "Customer success manager",
    experience: [
      {
        title: "Customer Success Manager",
        company: "ExampleCo",
        location: "Remote",
        start_date: "2022-01",
        end_date: null,
        is_current: true,
        achievements: ["Improved onboarding and retention"],
      },
    ],
    skills: [
      {
        name: "Customer Success",
        skills: [
          {
            name: "Customer Retention",
            proficiency: "advanced",
            years_experience: null,
          },
        ],
      },
    ],
    education: [
      {
        degree: "BA Communications",
        institution: "Example University",
        field_of_study: null,
        location: "Denver, CO",
        graduation_date: "2018",
        gpa: null,
        honors: [],
      },
    ],
    certifications: [],
    projects: [],
    clearance: null,
    military_info: null,
  },
  custom_sections: {},
};

export const mockAnalysis = {
  overall_score: 82,
  keyword_score: 80,
  format_score: 84,
  completeness_score: 82,
  keyword_matches: [],
  missing_keywords: [],
  missing_keyword_details: [],
  format_issues: [],
  suggestions: [],
};

export function mockInvokeResponses(
  responses: Record<string, unknown | Error>,
) {
  mockInvoke.mockImplementation((command) => {
    if (Object.prototype.hasOwnProperty.call(responses, command)) {
      const response = responses[command];
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response);
    }
    if (command === "get_active_resume") return Promise.resolve(null);
    return Promise.resolve(mockAnalysis);
  });
}

export function setupResumeMatchMocks() {
  vi.clearAllMocks();
  mockReadStorageValue.mockReturnValue(null);
  mockRemoveStorageValue.mockReturnValue(true);
  mockWriteStorageValue.mockReturnValue(true);
  mockInvokeResponses({});
}

export async function openResumeAppImport(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByRole("button", { name: /import from resume app/i }),
  );
}
