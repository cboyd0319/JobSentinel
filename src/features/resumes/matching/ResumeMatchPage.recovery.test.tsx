import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResumeMatch from "./ResumeMatchPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockReadStorageValue = vi.hoisted(() => vi.fn(() => null));
const mockRemoveStorageValue = vi.hoisted(() => vi.fn(() => true));
const mockWriteStorageValue = vi.hoisted(() => vi.fn(() => true));

vi.mock("../../../shared/browserStorage", () => ({
  readStorageValue: mockReadStorageValue,
  removeStorageValue: mockRemoveStorageValue,
  writeStorageValue: mockWriteStorageValue,
}));

const mockToast = {
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

const mockInvoke = vi.mocked(invoke);

const validResume = {
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
    experience: [{
      title: "Customer Success Manager",
      company: "ExampleCo",
      location: "Remote",
      start_date: "2022-01",
      end_date: null,
      is_current: true,
      achievements: ["Improved onboarding and retention"],
    }],
    skills: [{
      name: "Customer Success",
      skills: [{
        name: "Customer Retention",
        proficiency: "advanced",
        years_experience: null,
      }],
    }],
    education: [{
      degree: "BA Communications",
      institution: "Example University",
      field_of_study: null,
      location: "Denver, CO",
      graduation_date: "2018",
      gpa: null,
      honors: [],
    }],
    certifications: [],
    projects: [],
    clearance: null,
    military_info: null,
  },
  custom_sections: {},
};

const mockAnalysis = {
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

function mockInvokeResponses(responses: Record<string, unknown | Error>) {
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

async function openResumeAppImport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /import from resume app/i }));
}

describe("ResumeMatch recovery and bullet guidance", () => {
  const privateFailure = new Error(
    "token=raw-secret private@example.test local-resume-file",
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadStorageValue.mockReturnValue(null);
    mockRemoveStorageValue.mockReturnValue(true);
    mockWriteStorageValue.mockReturnValue(true);
    mockInvokeResponses({});
  });

  it("gives a plain recovery path when Resume Builder cannot receive the job post", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockWriteStorageValue.mockReturnValueOnce(false);
    render(<ResumeMatch onBack={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    const builderButton = await screen.findByRole("button", {
      name: /review in resume builder/i,
    });
    await user.click(builderButton);

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not open Resume Builder with this job",
      "Copy the job post and paste it in Resume Builder instead.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not show raw private details when job analysis fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report"),
      );
    });

    expect(toastErrorText()).not.toMatch(
      /raw-secret|private@example\.test|resume=private-file/,
    );
  });

  it("does not show raw private details when format analysis fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_format: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report"),
      );
    });

    expect(toastErrorText()).not.toMatch(
      /raw-secret|private@example\.test|resume=private-file/,
    );
  });

  it("does not show raw private details when bullet improvement fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ improve_bullet_point: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));
    fireEvent.change(screen.getByPlaceholderText(/reduce missed appointments/i), {
      target: { value: "Improved customer onboarding." },
    });
    await user.click(screen.getByRole("button", { name: "Draft" }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not draft bullet",
        expect.stringContaining("safe support report"),
      );
    });

    expect(toastErrorText()).not.toMatch(
      /raw-secret|private@example\.test|resume=private-file/,
    );
  });

  it("shows plain bullet frameworks before drafting an alternative", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));

    expect(screen.getByText("Use one simple structure")).toBeInTheDocument();
    expect(screen.getByText(/Action \+ scope \+ method \+ result/i)).toBeInTheDocument();
    expect(screen.getByText(/X-Y-Z/i)).toBeInTheDocument();
    expect(screen.getByText(/CAR/i)).toBeInTheDocument();
    expect(screen.getByText(/Only use details that are true/i)).toBeInTheDocument();
    expect(screen.queryByText(/beat ATS/i)).not.toBeInTheDocument();
  });

  it("uses action-first validation copy before drafting an empty bullet", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));
    await user.click(screen.getByRole("button", { name: "Draft" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Add a bullet point",
      "Paste or write one bullet, then draft again.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "improve_bullet_point",
      expect.anything(),
    );
  });
});
