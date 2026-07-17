import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  mockJob,
  renderWithToast,
  setupJobCardMocks,
} from "./JobCard.testSupport";
import * as deeplinks from "../../../shared/search-links";
import { JobCard } from "./JobCard";

describe("JobCard actions and accessibility", () => {
  beforeEach(setupJobCardMocks);
  describe("view button", () => {
    it("calls onViewJob when provided and clicked", async () => {
      const user = userEvent.setup();
      const onViewJob = vi.fn();
      renderWithToast(<JobCard job={mockJob} onViewJob={onViewJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(onViewJob).toHaveBeenCalledWith("https://example.com/job/1");
      expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
    });

    it("calls openDeepLink when onViewJob is not provided", async () => {
      const user = userEvent.setup();
      vi.mocked(deeplinks.openDeepLink).mockResolvedValue();
      renderWithToast(<JobCard job={mockJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(deeplinks.openDeepLink).toHaveBeenCalledWith(
        "https://example.com/job/1",
      );
    });

    it("shows plain guidance for unsafe saved links", async () => {
      const user = userEvent.setup();
      renderWithToast(<JobCard job={{ ...mockJob, url: "javascript:alert(1)" }} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(screen.getByTestId("job-link-guidance")).toHaveTextContent("Check job link");
      expect(
        await screen.findByText("This saved link does not look safe to open."),
      ).toBeInTheDocument();
      expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
    });

    it("blocks unsafe links before calling custom view opener", async () => {
      const user = userEvent.setup();
      const onViewJob = vi.fn();
      renderWithToast(
        <JobCard
          job={{ ...mockJob, url: "javascript:alert(1)" }}
          onViewJob={onViewJob}
        />,
      );

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      expect(
        await screen.findByText("This saved link does not look safe to open."),
      ).toBeInTheDocument();
      expect(onViewJob).not.toHaveBeenCalled();
      expect(deeplinks.openDeepLink).not.toHaveBeenCalled();
    });

    it("does not fall back to window.open when openDeepLink fails", async () => {
      const user = userEvent.setup();
      const mockWindowOpen = vi.fn();
      (window as typeof globalThis & { open: typeof window.open }).open =
        mockWindowOpen;
      vi.mocked(deeplinks.openDeepLink).mockRejectedValue(new Error("Failed"));

      renderWithToast(<JobCard job={mockJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      await user.click(viewBtn);

      await vi.waitFor(() => {
        expect(mockWindowOpen).not.toHaveBeenCalled();
      });
      expect(await screen.findByText("Could not open job link")).toBeInTheDocument();
      expect(
        screen.getByText("Copy the link and open it in your browser."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Failed to open link")).not.toBeInTheDocument();
    });

    it("has different styling for good match jobs", () => {
      const goodMatchJob = { ...mockJob, score: 0.75 };
      renderWithToast(<JobCard job={goodMatchJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      expect(viewBtn).toHaveClass("bg-sentinel-50");
    });

    it("has different styling for low match jobs", () => {
      const lowMatchJob = { ...mockJob, score: 0.5 };
      renderWithToast(<JobCard job={lowMatchJob} />);

      const viewBtn = screen.getByTestId("btn-view");
      expect(viewBtn).toHaveClass("bg-surface-50");
    });
  });

  describe("selected state", () => {
    it("applies selected styles when isSelected is true", () => {
      renderWithToast(<JobCard job={mockJob} isSelected={true} />);

      const card = screen.getByTestId("job-card");
      expect(card).toHaveAttribute("data-selected");
      expect(card).toHaveClass("ring-2", "ring-sentinel-500");
    });

    it("does not apply selected styles when isSelected is false", () => {
      renderWithToast(<JobCard job={mockJob} isSelected={false} />);

      const card = screen.getByTestId("job-card");
      expect(card).not.toHaveAttribute("data-selected");
    });
  });

  describe("accessibility", () => {
    it("has accessible labels for all action buttons", () => {
      renderWithToast(
        <JobCard
          job={mockJob}
          onToggleBookmark={vi.fn()}
          onHideJob={vi.fn()}
          onEditNotes={vi.fn()}
          onResearchCompany={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Bookmark this job")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Not interested in this job"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Add notes")).toBeInTheDocument();
      expect(screen.getByLabelText("Research company")).toBeInTheDocument();
    });

    it("has aria-hidden on decorative icons", () => {
      const { container } = renderWithToast(<JobCard job={mockJob} />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
