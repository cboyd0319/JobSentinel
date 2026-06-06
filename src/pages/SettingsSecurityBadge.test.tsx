import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecurityBadge } from "./SettingsSecurityBadge";

describe("SecurityBadge", () => {
  it("shows unavailable state separately from missing and saved credentials", () => {
    const { rerender } = render(
      <SecurityBadge status={{ exists: false, available: false }} />,
    );

    expect(screen.getByText("Saved details unavailable")).toBeInTheDocument();

    rerender(<SecurityBadge status={{ exists: false, available: true }} />);
    expect(screen.getByText("Will be saved securely on this computer")).toBeInTheDocument();

    rerender(<SecurityBadge status={{ exists: true, available: true }} />);
    expect(screen.getByText("Saved securely on this computer")).toBeInTheDocument();
  });
});
