import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardLinkedInWorkbenchModal } from "./DashboardOverlays";

describe("Dashboard overlays", () => {
  it("renders the app-composed LinkedIn workbench in its modal", () => {
    render(
      <DashboardLinkedInWorkbenchModal
        isOpen
        onClose={vi.fn()}
        workbench={<div>Composed LinkedIn workbench</div>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "LinkedIn Workbench" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Composed LinkedIn workbench")).toBeInTheDocument();
  });
});
