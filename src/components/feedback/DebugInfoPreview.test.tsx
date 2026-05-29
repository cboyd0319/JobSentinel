import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DebugInfoPreview } from "./DebugInfoPreview";

const systemInfo = {
  app_version: "2.6.4",
  platform: "macos",
  os_version: "macOS 15.5",
  architecture: "arm64",
};

const configSummary = {
  scrapers_enabled: 4,
  keywords_count: 6,
  has_location_prefs: true,
  has_salary_prefs: true,
  has_company_blocklist: false,
  has_company_allowlist: true,
  notifications_configured: 1,
  has_resume: true,
};

describe("DebugInfoPreview", () => {
  it("shows readable safe app details without raw JSON", async () => {
    const user = userEvent.setup();

    render(
      <DebugInfoPreview
        systemInfo={systemInfo}
        configSummary={configSummary}
        debugEvents={[
          {
            time: "2026-05-29T12:00:00Z",
            event: "CommandInvoked",
            details: {
              command: "search_jobs",
              success: true,
              owner_email: "candidate@example.com",
              nested: { token: "secret" },
            },
          },
        ]}
        included
        onToggle={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /safe app details/i }));

    expect(screen.getByText(/app and device/i)).toBeInTheDocument();
    expect(screen.getByText(/settings summary/i)).toBeInTheDocument();
    expect(screen.getByText(/recent app activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Action: search_jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/Result: succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/owner email: \[EMAIL\]/i)).toBeInTheDocument();
    expect(screen.getByText(/nested: details summarized/i)).toBeInTheDocument();
    expect(screen.queryByText(/\{"command"/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/candidate@example\.com/i)).not.toBeInTheDocument();
  });

  it("lets users remove safe app details before sharing", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <DebugInfoPreview
        systemInfo={systemInfo}
        configSummary={configSummary}
        debugEvents={[]}
        included
        onToggle={onToggle}
      />
    );

    await user.click(
      screen.getByRole("checkbox", { name: /include safe app details/i })
    );

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
