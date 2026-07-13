import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AtsBadge } from "./ApplyButton";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

describe("AtsBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Greenhouse badge when detected", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });
    });

    it("renders Lever badge when detected", async () => {
      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://jobs.lever.co/company/123" />);

      await waitFor(() => {
        expect(screen.getByText("Lever")).toBeInTheDocument();
      });
    });

    it("does not render for unknown platform", async () => {
      mockInvoke.mockResolvedValue({
        platform: "unknown",
        commonFields: [],
        automationNotes: null,
      });

      const { container } = render(<AtsBadge url="https://example.com/jobs/123" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("does not render on detection error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Failed to detect"));

      const { container } = render(<AtsBadge url="https://example.com/jobs/123" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      consoleError.mockRestore();
    });

    it("applies correct color class for greenhouse", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        const badge = screen.getByText("Greenhouse");
        expect(badge).toHaveClass("bg-green-100");
      });
    });

    it("applies correct color class for lever", async () => {
      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://jobs.lever.co/company/123" />);

      await waitFor(() => {
        const badge = screen.getByText("Lever");
        expect(badge).toHaveClass("bg-blue-100");
      });
    });

    it("renders expanded application form labels", async () => {
      mockInvoke.mockResolvedValue({
        platform: "smartrecruiters",
        commonFields: [],
        automationNotes: null,
      });

      render(<AtsBadge url="https://jobs.smartrecruiters.com/example/123" />);

      await waitFor(() => {
        const badge = screen.getByText("SmartRecruiters");
        expect(badge).toHaveClass("bg-sky-100");
      });
    });

    it("re-detects when URL changes", async () => {
      mockInvoke.mockResolvedValue({
        platform: "greenhouse",
        commonFields: [],
        automationNotes: null,
      });

      const { rerender } = render(<AtsBadge url="https://example.greenhouse.io/jobs/123" />);

      await waitFor(() => {
        expect(screen.getByText("Greenhouse")).toBeInTheDocument();
      });

      mockInvoke.mockResolvedValue({
        platform: "lever",
        commonFields: [],
        automationNotes: null,
      });

      rerender(<AtsBadge url="https://jobs.lever.co/company/456" />);

      await waitFor(() => {
        expect(screen.getByText("Lever")).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });
});
