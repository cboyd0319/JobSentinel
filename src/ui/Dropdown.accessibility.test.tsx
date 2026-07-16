import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dropdown } from "./Dropdown";

const mockOptions = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
  { value: "option3", label: "Option 3" },
];

describe("Dropdown accessibility", () => {
  it("sets the button ARIA attributes", () => {
    render(<Dropdown options={mockOptions} onChange={vi.fn()} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-haspopup", "listbox");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the listbox role when open", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={mockOptions} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders options with the option role", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={mockOptions} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("hides the chevron icon from assistive technology", () => {
    const { container } = render(
      <Dropdown options={mockOptions} onChange={vi.fn()} />,
    );

    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });
});
