import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "./DashboardHeader";
import type { ScrapingStatus } from "../types";

vi.mock("../../../ui/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock("../../../ui/Tooltip", () => ({
  Tooltip: ({ children, content }: { children: ReactNode; content: ReactNode }) => (
    <div aria-label={typeof content === "string" ? content : undefined}>{children}</div>
  ),
}));

const baseStatus: ScrapingStatus = {
  is_running: false,
  last_scrape: null,
  next_scrape: null,
};

function renderHeader(overrides: Partial<ComponentProps<typeof DashboardHeader>> = {}) {
  return render(
    <DashboardHeader
      scrapingStatus={baseStatus}
      autoRefreshEnabled={false}
      nextRefreshTime={null}
      formatTimeUntil={() => "5m"}
      searching={false}
      searchCooldown={false}
      cooldownSeconds={0}
      onSearchNow={vi.fn()}
      onOpenSettings={vi.fn()}
      tourAction={<button type="button">Tour</button>}
      {...overrides}
    />,
  );
}

describe("DashboardHeader plain source-check copy", () => {
  it("uses checking copy while a manual search is running", () => {
    renderHeader({
      searching: true,
      scrapingStatus: {
        ...baseStatus,
        is_running: true,
      },
    });

    expect(screen.getByRole("button", { name: "Checking job sources" })).toBeInTheDocument();
    expect(screen.getAllByText("Checking...").length).toBeGreaterThan(0);
    expect(screen.queryByText("Scanning...")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /scanning job boards/i })).not.toBeInTheDocument();
  });

  it("describes scheduled checks without auto-refresh jargon", () => {
    renderHeader({
      autoRefreshEnabled: true,
      nextRefreshTime: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(screen.getByLabelText(/next check in 5m/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/auto-refresh/i)).not.toBeInTheDocument();
  });
});
