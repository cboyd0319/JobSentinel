import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketAlertCard, MarketAlertList } from "./MarketAlertCard";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockAlert = {
  id: 1,
  alert_type: "skill_surge",
  title: "React Demand Spike",
  description: "React job postings increased by 45% this week",
  severity: "warning",
  related_entity: "React",
  metric_value: 450,
  metric_change_pct: 45.2,
  is_read: false,
  created_at: "2024-01-15T10:30:00Z",
};

const mockAlerts = [
  mockAlert,
  {
    id: 2,
    alert_type: "salary_spike",
    title: "Senior Engineer Salaries Up",
    description: "Average senior engineer salary increased 12%",
    severity: "info",
    related_entity: "Senior Engineer",
    metric_value: 165000,
    metric_change_pct: 12.5,
    is_read: true,
    created_at: "2024-01-14T09:00:00Z",
  },
  {
    id: 3,
    alert_type: "hiring_freeze",
    title: "TechCorp Hiring Pause",
    description: "TechCorp has paused hiring across all departments",
    severity: "critical",
    related_entity: "TechCorp",
    metric_value: null,
    metric_change_pct: null,
    is_read: false,
    created_at: "2024-01-13T14:20:00Z",
  },
];

describe("MarketAlertCard", () => {
  describe("rendering", () => {
    it("renders alert title", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByText("React Demand Spike")).toBeInTheDocument();
    });

    it("renders alert description", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByText(/react job postings increased by 45%/i)).toBeInTheDocument();
    });

    it("renders alert icon based on type", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      // skill_surge should show 🔧
      expect(screen.getByText("🔧")).toBeInTheDocument();
    });

    it("renders severity badge", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByText("warning")).toBeInTheDocument();
    });

    it("renders related entity badge", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      // Date should be formatted like "Jan 15, 10:30 AM"
      expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
    });
  });

  describe("severity styling", () => {
    it("applies critical severity styles", () => {
      const criticalAlert = { ...mockAlert, severity: "critical" };
      render(<MarketAlertCard alert={criticalAlert} />);
      
      const card = screen.getByRole("article");
      expect(card).toHaveClass("bg-red-50", "border-red-200");
    });

    it("applies warning severity styles", () => {
      const warningAlert = { ...mockAlert, severity: "warning" };
      render(<MarketAlertCard alert={warningAlert} />);
      
      const card = screen.getByRole("article");
      expect(card).toHaveClass("bg-alert-50", "border-alert-200");
    });

    it("applies info severity styles", () => {
      const infoAlert = { ...mockAlert, severity: "info" };
      render(<MarketAlertCard alert={infoAlert} />);
      
      const card = screen.getByRole("article");
      expect(card).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("displays severity indicator for critical", () => {
      const criticalAlert = { ...mockAlert, severity: "critical" };
      render(<MarketAlertCard alert={criticalAlert} />);
      // Check that critical severity is displayed
      expect(screen.getByText("critical")).toBeInTheDocument();
    });

    it("displays severity indicator for warning", () => {
      const warningAlert = { ...mockAlert, severity: "warning" };
      render(<MarketAlertCard alert={warningAlert} />);
      expect(screen.getByText("warning")).toBeInTheDocument();
    });

    it("displays severity indicator for info", () => {
      const infoAlert = { ...mockAlert, severity: "info" };
      render(<MarketAlertCard alert={infoAlert} />);
      expect(screen.getByText("info")).toBeInTheDocument();
    });
  });

  describe("alert type icons", () => {
    it("displays alert type for skill_surge", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "skill_surge" }} />);
      // Check for skill_surge related content
      expect(screen.getByText(/react demand spike/i)).toBeInTheDocument();
    });

    it("displays alert type for salary_spike", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "salary_spike" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("displays alert type for hiring_freeze", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "hiring_freeze" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("displays alert type for hiring_spree", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "hiring_spree" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("displays alert type for location_boom", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "location_boom" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("displays alert type for role_obsolete", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "role_obsolete" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("displays alert type for unknown type", () => {
      render(<MarketAlertCard alert={{ ...mockAlert, alert_type: "unknown" }} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });
  });

  describe("metric display", () => {
    it("shows positive metric change with green color", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      const changeElement = screen.getByText("+45.2%");
      expect(changeElement).toHaveClass("text-green-600");
    });

    it("shows negative metric change with red color", () => {
      const negativeAlert = { ...mockAlert, metric_change_pct: -15.5 };
      render(<MarketAlertCard alert={negativeAlert} />);
      const changeElement = screen.getByText("-15.5%");
      expect(changeElement).toHaveClass("text-red-600");
    });

    it("does not show metric change when null", () => {
      const noMetricAlert = { ...mockAlert, metric_change_pct: null };
      render(<MarketAlertCard alert={noMetricAlert} />);
      // Check that date is still shown but metric change is not
      expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
    });

    it("formats metric change with 1 decimal place", () => {
      const alert = { ...mockAlert, metric_change_pct: 12.3456 };
      render(<MarketAlertCard alert={alert} />);
      expect(screen.getByText("+12.3%")).toBeInTheDocument();
    });
  });

  describe("read/unread state", () => {
    it("applies opacity to read alerts", () => {
      const readAlert = { ...mockAlert, is_read: true };
      render(<MarketAlertCard alert={readAlert} />);
      
      const card = screen.getByRole("article");
      expect(card).toHaveClass("opacity-60");
    });

    it("does not apply opacity to unread alerts", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      
      const card = screen.getByRole("article");
      expect(card).not.toHaveClass("opacity-60");
    });

    it("shows Mark Read button for unread alerts", () => {
      const onMarkRead = vi.fn();
      render(<MarketAlertCard alert={mockAlert} onMarkRead={onMarkRead} />);
      
      expect(screen.getByRole("button", { name: /mark .* as read/i })).toBeInTheDocument();
    });

    it("does not show Mark Read button for read alerts", () => {
      const readAlert = { ...mockAlert, is_read: true };
      const onMarkRead = vi.fn();
      render(<MarketAlertCard alert={readAlert} onMarkRead={onMarkRead} />);
      
      expect(screen.queryByRole("button", { name: /mark read/i })).not.toBeInTheDocument();
    });

    it("does not show Mark Read button when onMarkRead is not provided", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.queryByRole("button", { name: /mark read/i })).not.toBeInTheDocument();
    });

    it("calls onMarkRead when Mark Read button is clicked", async () => {
      const user = userEvent.setup();
      const onMarkRead = vi.fn();
      render(<MarketAlertCard alert={mockAlert} onMarkRead={onMarkRead} />);
      
      const button = screen.getByRole("button", { name: /mark .* as read/i });
      await user.click(button);
      
      expect(onMarkRead).toHaveBeenCalledWith(1);
    });
  });

  describe("accessibility", () => {
    it("has article role", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("has descriptive aria-label", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      expect(screen.getByLabelText(/warning alert: react demand spike/i)).toBeInTheDocument();
    });

    it("has aria-live for unread alerts", () => {
      render(<MarketAlertCard alert={mockAlert} />);
      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-live", "polite");
    });

    it("does not have aria-live for read alerts", () => {
      const readAlert = { ...mockAlert, is_read: true };
      render(<MarketAlertCard alert={readAlert} />);
      const card = screen.getByRole("article");
      expect(card).not.toHaveAttribute("aria-live");
    });
  });
});

describe("MarketAlertList", () => {
  describe("rendering", () => {
    it("renders multiple alerts", () => {
      render(<MarketAlertList alerts={mockAlerts} />);
      expect(screen.getByText("React Demand Spike")).toBeInTheDocument();
      expect(screen.getByText("Senior Engineer Salaries Up")).toBeInTheDocument();
      expect(screen.getByText("TechCorp Hiring Pause")).toBeInTheDocument();
    });

    it("shows loading skeleton when loading", () => {
      render(<MarketAlertList alerts={[]} loading={true} />);
      expect(screen.getByRole("status", { name: /loading market alerts/i })).toBeInTheDocument();
    });

    it("shows empty state when no alerts", () => {
      render(<MarketAlertList alerts={[]} />);
      expect(screen.getByText(/no market alerts at this time/i)).toBeInTheDocument();
    });

    it("does not show loading skeleton when not loading", () => {
      render(<MarketAlertList alerts={mockAlerts} loading={false} />);
      expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
    });
  });

  describe("unread count", () => {
    it("displays unread count", () => {
      render(<MarketAlertList alerts={mockAlerts} onMarkAllRead={vi.fn()} />);
      // Check for unread count text
      expect(screen.getByText(/2 unread/i)).toBeInTheDocument();
    });

    it("uses singular form for 1 unread alert", () => {
      const oneUnread = [mockAlert];
      render(<MarketAlertList alerts={oneUnread} onMarkAllRead={vi.fn()} />);
      expect(screen.getByText(/1 unread/i)).toBeInTheDocument();
    });

    it("does not show unread count when all read", () => {
      const allRead = mockAlerts.map((a) => ({ ...a, is_read: true }));
      render(<MarketAlertList alerts={allRead} />);
      expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });

    it("does not show unread count when onMarkAllRead is not provided", () => {
      render(<MarketAlertList alerts={mockAlerts} />);
      expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });

    it("shows Mark All Read button when there are unread alerts", () => {
      const onMarkAllRead = vi.fn();
      render(<MarketAlertList alerts={mockAlerts} onMarkAllRead={onMarkAllRead} />);
      expect(screen.getByRole("button", { name: /mark all .* alerts as read/i })).toBeInTheDocument();
    });

    it("calls onMarkAllRead when Mark All Read is clicked", async () => {
      const user = userEvent.setup();
      const onMarkAllRead = vi.fn();
      render(<MarketAlertList alerts={mockAlerts} onMarkAllRead={onMarkAllRead} />);
      
      const button = screen.getByRole("button", { name: /mark all .* alerts as read/i });
      await user.click(button);
      
      expect(onMarkAllRead).toHaveBeenCalled();
    });
  });

  describe("alert interactions", () => {
    it("passes onMarkRead to individual cards", async () => {
      const user = userEvent.setup();
      const onMarkRead = vi.fn();
      render(<MarketAlertList alerts={mockAlerts} onMarkRead={onMarkRead} />);
      
      const markReadButtons = screen.getAllByRole("button", { name: /mark .* as read/i });
      await user.click(markReadButtons[0]);
      
      expect(onMarkRead).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has feed role", () => {
      render(<MarketAlertList alerts={mockAlerts} />);
      expect(screen.getByRole("feed")).toBeInTheDocument();
    });

    it("has descriptive aria-label", () => {
      render(<MarketAlertList alerts={mockAlerts} />);
      expect(screen.getByLabelText(/market alerts/i)).toBeInTheDocument();
    });

    it("has status role for empty state", () => {
      render(<MarketAlertList alerts={[]} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-live for unread count", () => {
      const onMarkAllRead = vi.fn();
      render(<MarketAlertList alerts={mockAlerts} onMarkAllRead={onMarkAllRead} />);
      const unreadStatus = screen.getByText(/2 unread alerts/i);
      expect(unreadStatus).toHaveAttribute("aria-live", "polite");
      expect(unreadStatus).toHaveAttribute("aria-atomic", "true");
    });

    it("has aria-busy when loading", () => {
      render(<MarketAlertList alerts={[]} loading={true} />);
      const loadingStatus = screen.getByRole("status", { name: /loading/i });
      expect(loadingStatus).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("loading skeleton", () => {
    it("renders 3 skeleton items", () => {
      const { container } = render(<MarketAlertList alerts={[]} loading={true} />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons).toHaveLength(3);
    });

    it("skeleton items have correct height", () => {
      const { container } = render(<MarketAlertList alerts={[]} loading={true} />);
      const skeletons = container.querySelectorAll(".h-24");
      expect(skeletons).toHaveLength(3);
    });
  });
});
