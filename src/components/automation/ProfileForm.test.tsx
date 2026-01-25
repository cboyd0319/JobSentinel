import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./ProfileForm";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Tauri dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

// Mock ToastContext
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("../../contexts", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

const { invoke } = await import("@tauri-apps/api/core");
const { open } = await import("@tauri-apps/plugin-dialog");
const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

const mockProfile = {
  id: 1,
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  githubUrl: "https://github.com/johndoe",
  portfolioUrl: "https://johndoe.com",
  websiteUrl: "https://blog.johndoe.com",
  defaultResumeId: null,
  resumeFilePath: "/path/to/resume.pdf",
  defaultCoverLetterTemplate: null,
  usWorkAuthorized: true,
  requiresSponsorship: false,
  maxApplicationsPerDay: 10,
  requireManualApproval: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ProfileForm />);

      expect(screen.getByRole("status", { name: /loading profile/i })).toBeInTheDocument();
      const spinner = screen.getByRole("status").querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("loading spinner has proper accessibility attributes", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ProfileForm />);

      const status = screen.getByRole("status", { name: /loading profile/i });
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("hides loading state after data loads", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });
    });

    it("shows 'taking longer' message after 5 seconds", async () => {
      vi.useFakeTimers();
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ProfileForm />);

      expect(screen.queryByText(/taking longer than expected/i)).not.toBeInTheDocument();

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("does not show 'taking longer' message if loads quickly", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      expect(screen.queryByText(/taking longer than expected/i)).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("form rendering with empty state", () => {
    it("renders form with default values when no profile exists", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/full name/i)).toHaveValue("");
      expect(screen.getByLabelText(/^email/i)).toHaveValue("");
      expect(screen.getByLabelText(/phone/i)).toHaveValue("");
    });

    it("renders all contact information fields", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Contact Information")).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it("renders all professional link fields", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Professional Links")).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/github/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/portfolio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
    });

    it("renders work authorization checkboxes", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Work Authorization")).toBeInTheDocument();
      });

      expect(screen.getByText("US Work Authorization")).toBeInTheDocument();
      expect(screen.getByText("Requires Sponsorship")).toBeInTheDocument();
    });

    it("renders automation settings", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Automation Settings")).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/maximum applications per day/i)).toBeInTheDocument();
      expect(screen.getByText("Require manual approval")).toBeInTheDocument();
    });

    it("has default values for checkboxes and select", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Work Authorization")).toBeInTheDocument();
      });

      const usWorkAuth = screen.getByRole("checkbox", { name: /us work authorization/i });
      const requiresSponsorship = screen.getByRole("checkbox", { name: /requires sponsorship/i });
      const requireApproval = screen.getByRole("checkbox", { name: /require manual approval/i });

      expect(usWorkAuth).toBeChecked();
      expect(requiresSponsorship).not.toBeChecked();
      expect(requireApproval).toBeChecked();
    });

    it("save button is disabled when form is clean", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText("Save Profile")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("form rendering with existing profile data", () => {
    it("populates all fields with existing profile data", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toHaveValue("John Doe");
      });

      expect(screen.getByLabelText(/^email/i)).toHaveValue("john@example.com");
      expect(screen.getByLabelText(/phone/i)).toHaveValue("+1 (555) 123-4567");
      expect(screen.getByLabelText(/linkedin/i)).toHaveValue("https://linkedin.com/in/johndoe");
      expect(screen.getByLabelText(/github/i)).toHaveValue("https://github.com/johndoe");
      expect(screen.getByLabelText(/portfolio/i)).toHaveValue("https://johndoe.com");
      expect(screen.getByLabelText(/website/i)).toHaveValue("https://blog.johndoe.com");
    });

    it("populates checkboxes with existing values", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        const usWorkAuth = screen.getByRole("checkbox", { name: /us work authorization/i });
        expect(usWorkAuth).toBeChecked();
      });

      const requiresSponsorship = screen.getByRole("checkbox", { name: /requires sponsorship/i });
      const requireApproval = screen.getByRole("checkbox", { name: /require manual approval/i });

      expect(requiresSponsorship).not.toBeChecked();
      expect(requireApproval).toBeChecked();
    });

    it("populates max applications per day select", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        const select = screen.getByLabelText(/maximum applications per day/i);
        expect(select).toHaveValue("10");
      });
    });

    it("populates resume file path", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        const resumeInput = screen.getByDisplayValue("/path/to/resume.pdf");
        expect(resumeInput).toBeInTheDocument();
      });
    });

    it("handles null optional fields gracefully", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        phone: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        websiteUrl: null,
        resumeFilePath: null,
      });

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toHaveValue("John Doe");
      });

      expect(screen.getByLabelText(/phone/i)).toHaveValue("");
      expect(screen.getByLabelText(/linkedin/i)).toHaveValue("");
      expect(screen.getByLabelText(/github/i)).toHaveValue("");
      expect(screen.getByLabelText(/portfolio/i)).toHaveValue("");
      expect(screen.getByLabelText(/website/i)).toHaveValue("");
    });
  });

  describe("input field changes", () => {
    it("updates full name field on change", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/full name/i);
      await user.type(input, "Jane Smith");

      expect(input).toHaveValue("Jane Smith");
    });

    it("updates email field on change", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/^email/i);
      await user.type(input, "jane@example.com");

      expect(input).toHaveValue("jane@example.com");
    });

    it("updates phone field on change", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/phone/i);
      await user.type(input, "+1 (555) 987-6543");

      expect(input).toHaveValue("+1 (555) 987-6543");
    });

    it("updates LinkedIn URL on change", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/linkedin/i);
      await user.type(input, "https://linkedin.com/in/janesmith");

      expect(input).toHaveValue("https://linkedin.com/in/janesmith");
    });

    it("toggles US work authorization checkbox", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox", { name: /us work authorization/i });
        expect(checkbox).toBeChecked();
      });

      const checkbox = screen.getByRole("checkbox", { name: /us work authorization/i });
      await user.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });

    it("toggles requires sponsorship checkbox", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox", { name: /requires sponsorship/i });
        expect(checkbox).not.toBeChecked();
      });

      const checkbox = screen.getByRole("checkbox", { name: /requires sponsorship/i });
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("changes max applications per day", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/maximum applications per day/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/maximum applications per day/i);
      await user.selectOptions(select, "20");

      expect(select).toHaveValue("20");
    });

    it("enables save button when form is dirty", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      expect(saveButton).toBeDisabled();

      const input = screen.getByLabelText(/full name/i);
      await user.clear(input);
      await user.type(input, "Jane Smith");

      expect(saveButton).not.toBeDisabled();
    });

    it("shows unsaved changes indicator", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();

      const input = screen.getByLabelText(/full name/i);
      await user.clear(input);
      await user.type(input, "Jane Smith");

      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });
  });

  describe("required field validation", () => {
    it("shows error when full name is empty on blur", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/full name/i);
      await user.clear(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      });
    });

    it("shows error when email is empty on blur", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/^email/i);
      await user.clear(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it("shows error when email is invalid on blur", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/^email/i);
      await user.type(input, "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("clears error when valid value is entered", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/full name/i);
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      });

      await user.type(input, "Jane Smith");

      await waitFor(() => {
        expect(screen.queryByText(/full name is required/i)).not.toBeInTheDocument();
      });
    });

    it("validates phone number format", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/phone/i);
      await user.type(input, "123");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/phone number must be between 10 and 15 digits/i)).toBeInTheDocument();
      });
    });

    it("validates URL format for LinkedIn", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/linkedin/i);
      await user.type(input, "not-a-url");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });

    it("accepts valid URL for GitHub", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/github/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/github/i);
      await user.type(input, "https://github.com/username");
      await user.tab();

      expect(screen.queryByText(/please enter a valid url/i)).not.toBeInTheDocument();
    });

    it("allows empty optional URL fields", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/linkedin/i);
      await user.click(input);
      await user.tab();

      expect(screen.queryByText(/please enter a valid url/i)).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls upsert_application_profile with correct data", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("upsert_application_profile", {
          input: expect.objectContaining({
            full_name: "Jane Smith",
            email: "jane@example.com",
          }),
        });
      });
    });

    it("shows success toast after successful save", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Profile saved",
          "Your application profile has been updated"
        );
      });
    });

    it("prevents submission with validation errors", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/^email/i), "invalid-email");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Please fix the errors",
          "Check the highlighted fields"
        );
      });

      expect(mockInvoke).not.toHaveBeenCalledWith("upsert_application_profile", expect.anything());
    });

    it("shows all validation errors on submit attempt", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it("trims whitespace from inputs before saving", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "  Jane Smith  ");
      await user.type(screen.getByLabelText(/^email/i), "  jane@example.com  ");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("upsert_application_profile", {
          input: expect.objectContaining({
            full_name: "Jane Smith",
            email: "jane@example.com",
          }),
        });
      });
    });

    it("converts empty strings to null for optional fields", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("upsert_application_profile", {
          input: expect.objectContaining({
            phone: null,
            linkedin_url: null,
            github_url: null,
            portfolio_url: null,
            website_url: null,
          }),
        });
      });
    });

    it("shows loading state during save", async () => {
      const user = userEvent.setup();
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "get_application_profile") return Promise.resolve(null);
        if (cmd === "upsert_application_profile") return new Promise(() => {}); // Never resolves
        return Promise.resolve();
      });

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it("shows error toast on save failure", async () => {
      const user = userEvent.setup();
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === "get_application_profile") return Promise.resolve(null);
        if (cmd === "upsert_application_profile") return Promise.reject(new Error("Save failed"));
        return Promise.resolve();
      });

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Failed to save", "Please try again");
      });
    });

    it("disables save button after successful save", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
      });

      expect(saveButton).toBeDisabled();
    });

    it("calls onSaved callback after successful save", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm onSaved={onSaved} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      const saveButton = screen.getByRole("button", { name: /save profile/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });
  });

  describe("resume file selection", () => {
    it("opens file dialog when browse button clicked", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);
      mockOpen.mockResolvedValue("/path/to/new-resume.pdf");

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText(/browse/i)).toBeInTheDocument();
      });

      const browseButton = screen.getByText(/browse/i);
      await user.click(browseButton);

      expect(mockOpen).toHaveBeenCalledWith({
        multiple: false,
        filters: [
          {
            name: "Resume",
            extensions: ["pdf", "docx", "doc"],
          },
        ],
      });
    });

    it("updates resume path when file selected", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);
      mockOpen.mockResolvedValue("/path/to/new-resume.pdf");

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText(/browse/i)).toBeInTheDocument();
      });

      const browseButton = screen.getByText(/browse/i);
      await user.click(browseButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue("/path/to/new-resume.pdf")).toBeInTheDocument();
      });
    });

    it("does not update path when dialog is cancelled", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);
      mockOpen.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("/path/to/resume.pdf")).toBeInTheDocument();
      });

      const browseButton = screen.getByText(/browse/i);
      await user.click(browseButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue("/path/to/resume.pdf")).toBeInTheDocument();
      });
    });

    it("shows clear button when resume is selected", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("/path/to/resume.pdf")).toBeInTheDocument();
      });

      const clearButton = screen.getByLabelText(/clear resume/i);
      expect(clearButton).toBeInTheDocument();
    });

    it("clears resume path when clear button clicked", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("/path/to/resume.pdf")).toBeInTheDocument();
      });

      const clearButton = screen.getByLabelText(/clear resume/i);
      await user.click(clearButton);

      const resumeInput = screen.getByPlaceholderText(/no resume selected/i);
      expect(resumeInput).toHaveValue("");
    });

    it("shows error toast on file selection error", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);
      mockOpen.mockRejectedValue(new Error("File selection failed"));

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText(/browse/i)).toBeInTheDocument();
      });

      const browseButton = screen.getByText(/browse/i);
      await user.click(browseButton);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Failed to select file", "Please try again");
      });
    });
  });

  describe("keyboard shortcuts", () => {
    it("saves form on Cmd+S when dirty", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      await user.keyboard("{Meta>}s{/Meta}");

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("upsert_application_profile", expect.anything());
      });
    });

    it("saves form on Cmd+Enter when dirty", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
      await user.type(screen.getByLabelText(/^email/i), "jane@example.com");

      await user.keyboard("{Meta>}{Enter}{/Meta}");

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("upsert_application_profile", expect.anything());
      });
    });

    it("does not save on keyboard shortcut when form is clean", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      mockInvoke.mockClear();

      await user.keyboard("{Meta>}s{/Meta}");

      // Should not call upsert since form is clean
      expect(mockInvoke).not.toHaveBeenCalledWith("upsert_application_profile", expect.anything());
    });
  });

  describe("accessibility", () => {
    it("has proper form role and label", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByRole("form", { name: /application profile form/i })).toBeInTheDocument();
      });
    });

    it("has labeled sections", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByRole("group", { name: /contact information/i })).toBeInTheDocument();
      });

      expect(screen.getByRole("group", { name: /professional links/i })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: /work authorization/i })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: /automation settings/i })).toBeInTheDocument();
    });

    it("required fields are marked with asterisk", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByText(/full name \*/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/email \*/i)).toBeInTheDocument();
    });

    it("inputs have proper autocomplete attributes", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/full name/i)).toHaveAttribute("autocomplete", "name");
      expect(screen.getByLabelText(/^email/i)).toHaveAttribute("autocomplete", "email");
      expect(screen.getByLabelText(/phone/i)).toHaveAttribute("autocomplete", "tel");
    });
  });

  describe("error handling", () => {
    it("shows error toast on profile load failure", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to load profile"));

      render(<ProfileForm />);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Failed to load profile", "Please try again");
      });
    });

    it("still renders form after load error", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to load profile"));

      render(<ProfileForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });
    });
  });
});
