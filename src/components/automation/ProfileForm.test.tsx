import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.useRealTimers();
  });

  it("shows plain slow-loading copy while opening the profile", async () => {
    vi.useFakeTimers();
    mockInvoke.mockImplementationOnce(() => new Promise(() => undefined));

    renderProfileForm();

    expect(screen.queryByText("Still opening your application profile...")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Still opening your application profile...")).toBeInTheDocument();
    expect(screen.queryByText("Taking longer than expected...")).not.toBeInTheDocument();
  });

  it("uses plain recovery copy when profile loading fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("load failed"));

    renderProfileForm();

    expect(await screen.findByText("Could not load profile")).toBeInTheDocument();
    expect(
      screen.getByText("Try again. If it keeps happening, copy a safe support report."),
    ).toBeInTheDocument();
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

  it("explains resume files as local and user-controlled", async () => {
    mockInvoke.mockResolvedValueOnce(mockProfile());

    renderProfileForm();

    await screen.findByLabelText("Selected resume");
    expect(
      screen.getByLabelText(
        "Choose a resume file saved on this device. You decide whether to attach it on each application.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Select your resume file (PDF or DOCX) for application review"),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByText(
        "Choose the resume again. If it keeps happening, copy a safe support report.",
      ),
    ).toBeInTheDocument();
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

  it("uses protective review pace choices", async () => {
    mockInvoke.mockResolvedValueOnce(mockProfile());

    renderProfileForm();

    const reviewPace = await screen.findByRole("combobox", {
      name: "Applications to review per day",
    });

    expect(screen.getByText("Review Pace")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use a pace you can review carefully. JobSentinel never submits applications for you.",
      ),
    ).toBeInTheDocument();
    expect(within(reviewPace).getByRole("option", { name: "3" })).toBeInTheDocument();
    expect(within(reviewPace).getByRole("option", { name: "15" })).toBeInTheDocument();
    expect(within(reviewPace).queryByRole("option", { name: "50" })).not.toBeInTheDocument();
    expect(screen.queryByText("Daily review limit:")).not.toBeInTheDocument();
  });

  it("keeps an existing high review pace visible without making it a normal choice", async () => {
    mockInvoke.mockResolvedValueOnce(mockProfile({ maxApplicationsPerDay: 20 }));

    renderProfileForm();

    const reviewPace = await screen.findByRole("combobox", {
      name: "Applications to review per day",
    });

    expect(reviewPace).toHaveValue("20");
    expect(
      within(reviewPace).getByRole("option", { name: "20 (current saved pace)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your saved pace is higher than the usual choices. Lower it if applications start crowding out verified, fairly paid roles.",
      ),
    ).toBeInTheDocument();
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
    expect(
      screen.getByText(
        "Check the highlighted fields, then save again. If it keeps happening, copy a safe support report.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to save")).not.toBeInTheDocument();
  });
});
