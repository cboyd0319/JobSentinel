import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
      expect(buttons.length).toBe(9); // 9 nav items
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
      const dashboardBtn = screen.getByTitle("Dashboard (Cmd/Ctrl+1)");
      fireEvent.click(dashboardBtn);

      expect(onNavigate).toHaveBeenCalledWith("dashboard");
    });

    it("calls onNavigate when Applications is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Applications (Cmd/Ctrl+2)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("applications");
    });

    it("calls onNavigate when Resumes is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Resumes (Cmd/Ctrl+3)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("resume");
    });

    it("calls onNavigate when Salary is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Salary (Cmd/Ctrl+4)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("salary");
    });

    it("calls onNavigate when Hiring Trends is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Hiring Trends (Cmd/Ctrl+5)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("market");
    });

    it("calls onNavigate when Application Assist is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Application Assist (Cmd/Ctrl+6)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("automation");
    });

    it("calls onNavigate when Resume Builder is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Resume Builder (Cmd/Ctrl+7)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("resume-builder");
    });

    it("calls onNavigate when Resume Match is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Resume Match (Cmd/Ctrl+8)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("ats-optimizer");
    });

    it("calls onNavigate when Search Links is clicked", () => {
      const onNavigate = vi.fn();
      render(<Navigation currentPage="dashboard" onNavigate={onNavigate} />);

      const btn = screen.getByTitle("Search Links (Cmd/Ctrl+9)");
      fireEvent.click(btn);

      expect(onNavigate).toHaveBeenCalledWith("search-links");
    });
  });

  describe("active state", () => {
    it("highlights Dashboard when it is the current page", () => {
      render(<Navigation currentPage="dashboard" onNavigate={vi.fn()} />);

      const btn = screen.getByTitle("Dashboard (Cmd/Ctrl+1)");
      expect(btn.className).toContain("bg-sentinel-100");
    });

    it("highlights Applications when it is the current page", () => {
      render(<Navigation currentPage="applications" onNavigate={vi.fn()} />);

      const btn = screen.getByTitle("Applications (Cmd/Ctrl+2)");
      expect(btn.className).toContain("bg-sentinel-100");
    });

    it("does not highlight other pages when Dashboard is active", () => {
      render(<Navigation currentPage="dashboard" onNavigate={vi.fn()} />);

      const applicationsBtn = screen.getByTitle("Applications (Cmd/Ctrl+2)");
      expect(applicationsBtn.className).not.toContain("bg-sentinel-100");
    });
  });

  describe("compact behavior", () => {
    it("starts collapsed (narrow width)", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav.style.width).toBe("64px");
    });

    it("keeps compact width on mouse enter", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(nav.style.width).toBe("64px");
    });

    it("keeps compact width on mouse leave", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);
      expect(nav.style.width).toBe("64px");

      fireEvent.mouseLeave(nav);
      expect(nav.style.width).toBe("64px");
    });

    it("keeps labels accessible without showing them in the compact rail", () => {
      render(<Navigation {...defaultProps} />);

      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Dashboard (Cmd/Ctrl+1)")).toBeInTheDocument();
      expect(screen.getByLabelText("Applications (Cmd/Ctrl+2)")).toBeInTheDocument();
      expect(screen.getByLabelText("Resumes (Cmd/Ctrl+3)")).toBeInTheDocument();
    });

    it("keeps keyboard shortcuts in tooltips", () => {
      render(<Navigation {...defaultProps} />);

      expect(screen.getByTitle("Dashboard (Cmd/Ctrl+1)")).toBeInTheDocument();
      expect(screen.getByTitle("Applications (Cmd/Ctrl+2)")).toBeInTheDocument();
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
      expect(screen.getByTitle("Dashboard (Cmd/Ctrl+1)")).toBeInTheDocument();
      expect(screen.getByTitle("Applications (Cmd/Ctrl+2)")).toBeInTheDocument();
    });

    it("keeps title on hover", () => {
      render(<Navigation {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      fireEvent.mouseEnter(nav);

      expect(screen.getByTitle("Dashboard (Cmd/Ctrl+1)")).toBeInTheDocument();
    });
  });
});
