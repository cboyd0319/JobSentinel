import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategorySelector } from "./CategorySelector";

describe("CategorySelector plain-language choices", () => {
  it("shows support choices without bug-report or feature-request jargon", () => {
    render(<CategorySelector selected={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /report a problem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suggest an improvement/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ask a question/i })).toBeInTheDocument();
    expect(screen.queryByText(/bug report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/feature request/i)).not.toBeInTheDocument();
  });

  it("keeps the existing problem category value when selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CategorySelector selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /report a problem/i }));

    expect(onSelect).toHaveBeenCalledWith("bug");
  });
});
