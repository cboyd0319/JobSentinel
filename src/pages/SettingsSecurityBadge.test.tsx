import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecurityBadge } from "./SettingsSecurityBadge";

describe("SecurityBadge", () => {
  it("shows expected, missing, saved, and attention states separately", () => {
    const { rerender } = render(
      <SecurityBadge status={{ exists: false, available: false, state: "expected" }} />,
    );

    expect(screen.getByText("Saved details need confirmation")).toBeInTheDocument();

    rerender(<SecurityBadge status={{ exists: false, available: true, state: "empty" }} />);
    expect(screen.getByText("Will be saved securely on this computer")).toBeInTheDocument();

    rerender(<SecurityBadge status={{ exists: true, available: true, state: "saved" }} />);
    expect(screen.getByText("Saved securely on this computer")).toBeInTheDocument();

    rerender(<SecurityBadge status={{ exists: true, available: false, state: "needs_attention" }} />);
    expect(screen.getByText("Saved details need attention")).toBeInTheDocument();
  });
});
