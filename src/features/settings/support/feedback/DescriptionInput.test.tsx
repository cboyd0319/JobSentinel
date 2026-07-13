import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DescriptionInput } from "./DescriptionInput";

describe("DescriptionInput plain-language prompts", () => {
  it("asks problem reporters for repeatable steps without technical wording", () => {
    render(
      <DescriptionInput
        category="bug"
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/description/i);

    expect(input).toHaveAttribute(
      "placeholder",
      expect.stringContaining("Can you make it happen again?")
    );
    expect(input).not.toHaveAttribute(
      "placeholder",
      expect.stringContaining("reproduce")
    );
  });

  it("uses topic wording before a choice is selected", () => {
    render(
      <DescriptionInput
        category={null}
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/description/i)).toHaveAttribute(
      "placeholder",
      "Choose a topic first..."
    );
  });
});
