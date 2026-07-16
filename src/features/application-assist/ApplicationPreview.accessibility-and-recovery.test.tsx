import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ApplicationPreview } from "./ApplicationPreview";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const mockJob = {
  id: 1,
  hash: "test-hash-123",
  title: "Customer Support Manager",
  company: "CareBridge Health",
  location: "Chicago, IL",
  url: "https://example.com/jobs/123",
  description: "Great opportunity",
  score: 85,
};

const mockProfile = {
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  phone: "+1 (555) 123-4567",
  linkedinUrl: "https://linkedin.com/in/jordanlee",
  githubUrl: "https://profile.example.com/jordanlee",
  portfolioUrl: "https://jordanlee.example.com/work",
  websiteUrl: "https://jordanlee.example.com",
  usWorkAuthorized: true,
  requiresSponsorship: false,
};

describe("ApplicationPreview accessibility and recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("has labeled group for prepared fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/fields JobSentinel can prepare/i);
        expect(heading).toHaveAttribute("id", "prepared-fields-heading");
      });
    });

    it("has labeled group for manual fields", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const heading = screen.getByText(/you will complete and review/i);
        expect(heading).toHaveAttribute("id", "manual-fields-heading");
      });
    });

    it("icons are present in the component", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      const { container } = render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("prepared fields list has proper role", async () => {
      mockInvoke.mockResolvedValue(mockProfile);

      render(<ApplicationPreview job={mockJob} atsPlatform="greenhouse" />);

      await waitFor(() => {
        const list = screen.getByRole("list", { name: /prepared fields/i });
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

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe("cleanup", () => {
    it("aborts fetch on unmount", async () => {
      let resolveProfile: (value: typeof mockProfile) => void = () => {};
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProfile = resolve;
          }),
      );

      const { container, unmount } = render(
        <ApplicationPreview job={mockJob} atsPlatform="greenhouse" />,
      );

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();

      unmount();
      expect(container).toBeEmptyDOMElement();

      await act(async () => {
        resolveProfile(mockProfile);
        await Promise.resolve();
      });

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
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
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
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
