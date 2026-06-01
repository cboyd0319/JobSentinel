import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../contexts";
import { ProfileForm } from "./ProfileForm";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const { open } = await import("@tauri-apps/plugin-dialog");
const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

function renderProfileForm() {
  return render(
    <ToastProvider>
      <ProfileForm />
    </ToastProvider>,
  );
}

function mockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    fullName: "Jordan Lee",
    email: "jordan@example.com",
    phone: "+1 (555) 123-4567",
    linkedinUrl: "https://linkedin.com/in/jordanlee",
    githubUrl: null,
    portfolioUrl: "https://jordanlee.example.com/work",
    websiteUrl: "https://jordanlee.example.com",
    defaultResumeId: null,
    hasResumeFile: true,
    resumeFileName: "client-resume.pdf",
    defaultCoverLetterTemplate: null,
    usWorkAuthorized: true,
    requiresSponsorship: false,
    maxApplicationsPerDay: 10,
    requireManualApproval: true,
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("ProfileForm resume privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows saved resume name without exposing a raw local path", async () => {
    mockInvoke.mockResolvedValueOnce(mockProfile());

    renderProfileForm();

    await waitFor(() => {
      expect(screen.getByLabelText("Selected resume")).toHaveValue("client-resume.pdf");
    });

    expect(screen.queryByDisplayValue(/Users\/jordan/)).not.toBeInTheDocument();
  });

  it("keeps saved resume path on profile edits unless the user replaces or clears it", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockProfile()).mockResolvedValueOnce(1);

    renderProfileForm();

    await screen.findByDisplayValue("Jordan Lee");
    await user.clear(screen.getByLabelText(/Full Name/));
    await user.type(screen.getByLabelText(/Full Name/), "Jordan Parker");
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "upsert_application_profile",
        expect.objectContaining({
          input: expect.objectContaining({
            full_name: "Jordan Parker",
            resume_file_path: null,
            clear_resume_file: false,
          }),
        }),
      );
    });
  });

  it("shows only the file name after the user selects a replacement resume", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockProfile({ hasResumeFile: false, resumeFileName: null }));
    mockOpen.mockResolvedValueOnce("/Users/jordan/private/new-resume.docx");

    renderProfileForm();

    await screen.findByLabelText("Selected resume");
    await user.click(screen.getByRole("button", { name: "Browse..." }));

    await waitFor(() => {
      expect(screen.getByLabelText("Selected resume")).toHaveValue("new-resume.docx");
    });
    expect(screen.queryByDisplayValue(/Users\/jordan/)).not.toBeInTheDocument();
  });

  it("sends an explicit clear flag when the user removes the saved resume", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockProfile()).mockResolvedValueOnce(1);

    renderProfileForm();

    await screen.findByDisplayValue("client-resume.pdf");
    await user.click(screen.getByRole("button", { name: "Clear resume" }));
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "upsert_application_profile",
        expect.objectContaining({
          input: expect.objectContaining({
            resume_file_path: null,
            clear_resume_file: true,
          }),
        }),
      );
    });
  });
});
