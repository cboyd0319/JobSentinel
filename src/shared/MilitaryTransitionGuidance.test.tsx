/** Verifies optional military-to-civilian guidance remains manual and bounded. */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MilitaryTransitionGuidance } from "./MilitaryTransitionGuidance";

const openDeepLink = vi.hoisted(() => vi.fn());
vi.mock("./search-links", () => ({ openDeepLink }));

describe("MilitaryTransitionGuidance", () => {
  beforeEach(() => openDeepLink.mockReset());

  it("keeps service evidence manual and exposes only reviewed O*NET and DoD COOL metadata", () => {
    render(<MilitaryTransitionGuidance />);

    const summary = screen.getByText("Military-to-civilian guidance (optional)");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(summary);

    expect(screen.getByText(/actual service duties, occupation codes, dates, and credentials from your records/i)).toBeVisible();
    expect(screen.getByText(/work history is optional/i)).toBeVisible();
    expect(screen.getByText(/using these tools does not require medical or disability details/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Open O*NET Military Crosswalk in browser" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Department of Defense COOL Military Occupations in browser" })).toBeVisible();
    expect(screen.getByText(/Reviewed 2026-07-19/i)).toBeVisible();
    expect(screen.getByText(/Reviewed 2026-07-18/i)).toBeVisible();
    expect(screen.queryByText(/USAJOBS API|OPM Veteran Job Seekers/i)).not.toBeInTheDocument();
    expect(screen.getByText(/do not author or verify wording, eligibility, clearance, or equivalence/i)).toBeVisible();
    expect(openDeepLink).not.toHaveBeenCalled();
  });

  it("opens a reviewed manual reference only after an explicit action", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    openDeepLink.mockResolvedValue(undefined);
    render(<MilitaryTransitionGuidance />);

    await user.click(screen.getByText("Military-to-civilian guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Open O*NET Military Crosswalk in browser" }));

    expect(openDeepLink).toHaveBeenCalledWith("https://www.onetcenter.org/crosswalks.html");
  });

  it("keeps a reference-opening failure local and actionable", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    openDeepLink.mockRejectedValueOnce(new Error("unavailable"));
    render(<MilitaryTransitionGuidance />);

    await user.click(screen.getByText("Military-to-civilian guidance (optional)"));
    await user.click(screen.getByRole("button", { name: "Open O*NET Military Crosswalk in browser" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not open this reference. Check the address in your browser or try again.",
    );
  });
});
