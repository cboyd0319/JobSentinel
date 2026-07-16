import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModalFooter } from "./Modal";

describe("ModalFooter", () => {
  it("renders children", () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalFooter>,
    );

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("applies border and padding styles", () => {
    render(
      <ModalFooter>
        <button>Action</button>
      </ModalFooter>,
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("border-t");
    expect(footer?.className).toContain("pt-4");
  });

  it("applies custom className", () => {
    render(
      <ModalFooter className="custom-footer-class">
        <button>Action</button>
      </ModalFooter>,
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("custom-footer-class");
  });

  it("uses flexbox for layout", () => {
    render(
      <ModalFooter>
        <button>Action</button>
      </ModalFooter>,
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("flex");
    expect(footer?.className).toContain("justify-end");
    expect(footer?.className).toContain("gap-3");
  });
});
