import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../contexts";
import { ProfileForm } from "./ProfileForm";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

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

  it("uses plain recovery copy when profile loading fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("load failed"));

    renderProfileForm();

    expect(await screen.findByText("Could not load profile")).toBeInTheDocument();
    expect(screen.getByText("Please try again")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load profile")).not.toBeInTheDocument();
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
            resume_file_token: null,
            clear_resume_file: false,
          }),
        }),
      );
    });
  });

  it("shows only the file name after the user selects a replacement resume", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockProfile({ hasResumeFile: false, resumeFileName: null }));
    mockInvoke.mockResolvedValueOnce({
      token: "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--new-resume.docx",
      fileName: "new-resume.docx",
    });

    renderProfileForm();

    await screen.findByLabelText("Selected resume");
    await user.click(screen.getByRole("button", { name: "Choose Resume" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Selected resume")).toHaveValue("new-resume.docx");
    });
    expect(screen.queryByDisplayValue(/Users\/jordan/)).not.toBeInTheDocument();
  });

  it("uses plain recovery copy when resume selection fails", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce(mockProfile({ hasResumeFile: false, resumeFileName: null }))
      .mockRejectedValueOnce(new Error("file dialog failed"));

    renderProfileForm();

    await screen.findByLabelText("Selected resume");
    await user.click(screen.getByRole("button", { name: "Choose Resume" }));

    expect(await screen.findByText("Could not select resume")).toBeInTheDocument();
    expect(screen.queryByText("Failed to select file")).not.toBeInTheDocument();
  });

  it("saves the backend resume token instead of a local file path", async () => {
    const user = userEvent.setup();
    const resumeToken = "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--new-resume.docx";
    mockInvoke
      .mockResolvedValueOnce(mockProfile({ hasResumeFile: false, resumeFileName: null }))
      .mockResolvedValueOnce({ token: resumeToken, fileName: "new-resume.docx" })
      .mockResolvedValueOnce(1);

    renderProfileForm();

    await screen.findByLabelText("Selected resume");
    await user.click(screen.getByRole("button", { name: "Choose Resume" }));
    await screen.findByDisplayValue("new-resume.docx");
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      const upsertCall = mockInvoke.mock.calls.find(
        ([command]) => command === "upsert_application_profile",
      );
      const input = upsertCall?.[1]?.input as Record<string, unknown> | undefined;
      expect(input).toEqual(expect.objectContaining({ resume_file_token: resumeToken }));
      expect(input).not.toHaveProperty("resume_file_path");
    });
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
            resume_file_token: null,
            clear_resume_file: true,
          }),
        }),
      );
    });
  });

  it("uses plain validation copy for missing required fields", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockProfile());

    renderProfileForm();

    await screen.findByDisplayValue("Jordan Lee");
    await user.clear(screen.getByLabelText(/Full Name/));
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    expect(await screen.findByText("Check highlighted fields")).toBeInTheDocument();
    expect(
      screen.getByText("Add the missing details, then save again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Please fix the errors")).not.toBeInTheDocument();
  });

  it("uses plain recovery copy when profile saving fails", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce(mockProfile())
      .mockRejectedValueOnce(new Error("save failed"));

    renderProfileForm();

    await screen.findByDisplayValue("Jordan Lee");
    await user.clear(screen.getByLabelText(/Full Name/));
    await user.type(screen.getByLabelText(/Full Name/), "Jordan Parker");
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    expect(await screen.findByText("Could not save profile")).toBeInTheDocument();
    expect(screen.queryByText("Failed to save")).not.toBeInTheDocument();
  });
});
