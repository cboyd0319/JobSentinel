import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navigation } from "./Navigation";

describe("Navigation", () => {
  const defaultProps = {
    currentPage: "dashboard" as const,
    onNavigate: vi.fn(),
  };

  describe("rendering", () => {
    it("renders nav element", () => {
      render(<Navigation {...defaultProps} />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders all navigation items", () => {
      render(<Navigation {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(8); // 8 nav items
    });

    it("renders logo", () => {
      render(<Navigation {...defaultProps} />);

      // Logo should be visible (the sentinel icon area)
      const nav = screen.getByRole("navigation");
      expect(nav.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("navigation items", () => {
    it("calls onNavigate when Dashboard is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="applications" onNavigate={onNavigate} />);

      // Find the dashboard button by its title (shown when collapsed)
      const dashboardBtn = screen.getByTitle("Dashboard (⌘1)");
      fireEvent.click(dashboardBtn);

      expect(onNavigate).toHaveBeenCalledWith("dashboard");
    });

    it("calls onNavigate when Applications is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Applications (⌘2)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("applications");
    });

    it("calls onNavigate when Resumes is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Resumes (⌘3)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("resume");
    });

    it("calls onNavigate when Salary is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Salary (⌘4)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("salary");
    });

    it("calls onNavigate when Market Intel is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Market Intel (⌘5)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("market");
    });

    it("calls onNavigate when One-Click Apply is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("One-Click Apply (⌘6)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("automation");
    });

    it("calls onNavigate when Resume Builder is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Resume Builder (⌘7)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("resume-builder");
    });

    it("calls onNavigate when ATS Optimizer is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("ATS Optimizer (⌘8)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("ats-optimizer");
    });
  });

  describe("active state", () => {
    it("highlights Dashboard when it is the current page", () => {
      render(<Navigation currentPage="dashboard" onNavigate={vi.fn()} />);

      const btn = screen.getByTitle("Dashboard (⌘1)");
      expect(btn.className).toContain("bg-sentinel-100");
    });

    it("highlights Applications when it is the current page", () => {
      render(<Navigation currentPage="applications" onNavigate={vi.fn()} />);

      const btn = screen.getByTitle("Applications (⌘2)");
      expect(btn.className).toContain("bg-sentinel-100");
    });

    it("does not highlight other pages when Dashboard is active", () => {
      render(<Navigation currentPage="dashboard" onNavigate={vi.fn()} />);

      const applicationsBtn = screen.getByTitle("Applications (⌘2)");
      expect(applicationsBtn.className).not.toContain("bg-sentinel-100");
    });
  });

  describe("expand/collapse behavior", () => {
    it("starts collapsed (narrow width)", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav.style.width).toBe("64px");
    });

    it("expands on mouse enter", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(nav.style.width).toBe("200px");
    });

    it("collapses on mouse leave", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);
      expect(nav.style.width).toBe("200px");

      fireEvent.mouseLeave(nav);
      expect(nav.style.width).toBe("64px");
    });

    it("shows labels when expanded", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Applications")).toBeInTheDocument();
      expect(screen.getByText("Resumes")).toBeInTheDocument();
    });

    it("shows keyboard shortcuts when expanded", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(screen.getByText("⌘1")).toBeInTheDocument();
      expect(screen.getByText("⌘2")).toBeInTheDocument();
    });

    it("shows app name when expanded", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(screen.getByText("JobSentinel")).toBeInTheDocument();
    });

    it("shows command palette hint when expanded", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(screen.getByText(/Press/)).toBeInTheDocument();
      expect(screen.getByText("⌘K")).toBeInTheDocument();
    });

    it("hides labels when collapsed", () => {
      render(<Navigation {...defaultProps} />);

      // Initially collapsed - labels should not be visible
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("tooltips (collapsed state)", () => {
    it("shows tooltip with label and shortcut when collapsed", () => {
      render(<Navigation {...defaultProps} />);

      // In collapsed state, buttons have title attributes
      expect(screen.getByTitle("Dashboard (⌘1)")).toBeInTheDocument();
      expect(screen.getByTitle("Applications (⌘2)")).toBeInTheDocument();
    });

    it("removes title when expanded", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      // In expanded state, buttons don't have title attributes
      const dashboardBtn = screen.getByText("Dashboard").closest("button");
      expect(dashboardBtn).not.toHaveAttribute("title");
    });
  });
});
