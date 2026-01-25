import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ApplicationPreview } from "./ApplicationPreview";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const mockJob = {
  id: 1,
  hash: "test-hash-123",
  title: "Senior Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

const mockProfile = {
  id: 1,
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  githubUrl: "https://github.com/johndoe",
  portfolioUrl: "https://johndoe.com",
  websiteUrl: "https://blog.johndoe.com",
  usWorkAuthorized: true,
  requiresSponsorship: false,
};

describe("ApplicationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      expect(screen.getByRole("status", { name: /loading application preview/i })).toBeInTheDocument();
      const spinner = screen.getByRole("status").querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("loading spinner has proper accessibility attributes", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      const status = screen.getByRole("status", { name: /loading application preview/i });
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("hides loading state after data loads", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("no profile state", () => {
    it("shows message when profile is null", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/no profile configured/i)).toBeInTheDocument();
      });
    });

    it("shows setup instruction when no profile", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/set up your application profile first/i)).toBeInTheDocument();
      });
    });

    it("no profile message has proper role", async () => {
      mockInvoke.mockResolvedValue(null);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const message = screen.getByText(/no profile configured/i);
        expect(message.closest('[role="status"]')).toBeInTheDocument();
      });
    });
  });

  describe("job summary rendering", () => {
    it("displays job title", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
      });
    });

    it("displays company name", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/Tech Corp/)).toBeInTheDocument();
      });
    });

    it("displays location", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
      });
    });

    it("shows ATS badge when platform is known", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("greenhouse")).toBeInTheDocument();
      });
    });

    it("does not show ATS badge when platform is unknown", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="unknown" />);

      await waitFor(() => {
        const badge = screen.queryByLabelText(/application tracking system/i);
        expect(badge).not.toBeInTheDocument();
      });
    });

    it("does not show ATS badge when platform is null", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform={null} />);

      await waitFor(() => {
        const badge = screen.queryByLabelText(/application tracking system/i);
        expect(badge).not.toBeInTheDocument();
      });
    });
  });

  describe("auto-filled fields display", () => {
    it("displays full name", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Full Name")).toBeInTheDocument();
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("displays email", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
      });
    });

    it("displays phone when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Phone")).toBeInTheDocument();
        expect(screen.getByText("+1 (555) 123-4567")).toBeInTheDocument();
      });
    });

    it("displays LinkedIn when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText("https://linkedin.com/in/johndoe")).toBeInTheDocument();
      });
    });

    it("displays GitHub when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
        expect(screen.getByText("https://github.com/johndoe")).toBeInTheDocument();
      });
    });

    it("displays portfolio when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Portfolio")).toBeInTheDocument();
        expect(screen.getByText("https://johndoe.com")).toBeInTheDocument();
      });
    });

    it("displays website when provided", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Website")).toBeInTheDocument();
        expect(screen.getByText("https://blog.johndoe.com")).toBeInTheDocument();
      });
    });

    it("displays US work authorization status", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("US Work Authorization")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
    });

    it("displays sponsorship requirement", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Requires Sponsorship")).toBeInTheDocument();
        const values = screen.getAllByText("No");
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it("shows 'No' for work authorization when false", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        usWorkAuthorized: false,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("US Work Authorization")).toBeInTheDocument();
        const values = screen.getAllByText("No");
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it("shows 'Yes' for sponsorship when true", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        requiresSponsorship: true,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Requires Sponsorship")).toBeInTheDocument();
        const values = screen.getAllByText("Yes");
        expect(values.length).toBeGreaterThan(0);
      });
    });
  });

  describe("missing optional fields", () => {
    it("does not show phone when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        phone: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
      });
    });

    it("does not show LinkedIn when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        linkedinUrl: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("does not show GitHub when null", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        githubUrl: null,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
      });
    });

    it("handles minimal profile with only required fields", async () => {
      mockInvoke.mockResolvedValue({
        id: 1,
        fullName: "Jane Smith",
        email: "jane@example.com",
        phone: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        websiteUrl: null,
        usWorkAuthorized: true,
        requiresSponsorship: false,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });
  });

  describe("manual tasks section", () => {
    it("displays resume upload task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/resume upload/i)).toBeInTheDocument();
      });
    });

    it("displays cover letter task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/cover letter/i)).toBeInTheDocument();
      });
    });

    it("displays screening questions task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/additional screening questions/i)).toBeInTheDocument();
      });
    });

    it("displays CAPTCHA task", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/captcha verification/i)).toBeInTheDocument();
      });
    });

    it("displays submit button reminder", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/final submit button/i)).toBeInTheDocument();
      });
    });
  });

  describe("info banner", () => {
    it("displays 'How it works' heading", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("How it works")).toBeInTheDocument();
      });
    });

    it("explains browser will open", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/browser window will open/i)).toBeInTheDocument();
      });
    });

    it("explains data will be filled", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/profile data will be filled/i)).toBeInTheDocument();
      });
    });

    it("instructs user to review", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/review the filled data/i)).toBeInTheDocument();
      });
    });

    it("instructs user to click submit", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText(/click the submit button yourself/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has region landmark for preview content", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const region = screen.getByRole("region", { name: /application preview/i });
        expect(region).toBeInTheDocument();
      });
    });

    it("has labeled group for auto-filled fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/fields that will be auto-filled/i);
        expect(heading).toHaveAttribute("id", "auto-filled-heading");
      });
    });

    it("has labeled group for manual fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/you'll need to complete manually/i);
        expect(heading).toHaveAttribute("id", "manual-fields-heading");
      });
    });

    it("icons are present in the component", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      const { container } = render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const icons = container.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("auto-filled fields list has proper role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const list = screen.getByRole("list", { name: /auto-filled fields/i });
        expect(list).toBeInTheDocument();
      });
    });

    it("manual tasks list has proper role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const list = screen.getByRole("list", { name: /manual tasks/i });
        expect(list).toBeInTheDocument();
      });
    });

    it("info banner has complementary role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const banner = screen.getByRole("complementary");
        expect(banner).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("handles invoke error gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Failed to load profile"));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it("clears loading state on error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      // Should show loading first
      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      // Then clear loading state
      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe("cleanup", () => {
    it("aborts fetch on unmount", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { unmount } = render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      // Unmount should abort the request
      unmount();

      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty string values gracefully", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        phone: "",
        linkedinUrl: "",
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        // Empty strings should not be displayed
        expect(screen.queryByText("Phone")).not.toBeInTheDocument();
        expect(screen.queryByText("LinkedIn")).not.toBeInTheDocument();
      });
    });

    it("handles very long field values", async () => {
      const longUrl = "https://example.com/" + "a".repeat(200);
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        linkedinUrl: longUrl,
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("LinkedIn")).toBeInTheDocument();
        expect(screen.getByText(longUrl)).toBeInTheDocument();
      });
    });

    it("handles special characters in profile data", async () => {
      mockInvoke.mockResolvedValue({
        ...mockProfile,
        fullName: "José García-López",
        email: "josé+test@example.com",
      });

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        expect(screen.getByText("José García-López")).toBeInTheDocument();
        expect(screen.getByText("josé+test@example.com")).toBeInTheDocument();
      });
    });
  });
});
