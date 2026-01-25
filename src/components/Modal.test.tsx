import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal, ModalFooter } from "./Modal";

describe("Modal", () => {
  beforeEach(() => {
    // Reset body overflow style
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders when isOpen is true", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders children", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Test content</div>
        </Modal>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("renders in a portal", () => {
      render(
        <div data-testid="parent">
          <Modal isOpen={true} onClose={vi.fn()}>
            Content
          </Modal>
        </div>
      );

      const parent = screen.getByTestId("parent");
      const dialog = screen.getByRole("dialog");

      // Dialog should not be inside the parent
      expect(parent.contains(dialog)).toBe(false);
      // Dialog should be direct child of body
      expect(dialog.parentElement).toBe(document.body);
    });
  });

  describe("title and description", () => {
    it("renders title when provided", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          Content
        </Modal>
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("renders title as h2 heading", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          Content
        </Modal>
      );

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Title");
    });

    it("renders description when provided", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} description="Test description">
          Content
        </Modal>
      );

      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("sets aria-labelledby when title is provided", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          Content
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
    });

    it("sets aria-describedby when description is provided", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} description="Test description">
          Content
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-describedby", "modal-description");
    });
  });

  describe("close button", () => {
    it("shows close button by default", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("hides close button when showCloseButton is false", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} showCloseButton={false}>
          Content
        </Modal>
      );

      expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          Content
        </Modal>
      );

      fireEvent.click(screen.getByLabelText("Close modal"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("overlay click", () => {
    it("calls onClose when overlay is clicked by default", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          Content
        </Modal>
      );

      // Click the backdrop (first child of dialog's parent)
      const dialog = screen.getByRole("dialog");
      const backdrop = dialog.querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when closeOnOverlayClick is false", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
          Content
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      const backdrop = dialog.querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop!);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("keyboard handling", () => {
    it("calls onClose when Escape is pressed", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          Content
        </Modal>
      );

      // The onKeyDown handler is on the modal content div, which contains the content
      const modalContent = screen.getByText("Content").parentElement;
      fireEvent.keyDown(modalContent!, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("sizes", () => {
    it("applies small size class", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          Content
        </Modal>
      );

      const modalContent = screen.getByText("Content").parentElement;
      expect(modalContent?.className).toContain("max-w-sm");
    });

    it("applies medium size class by default", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      const modalContent = screen.getByText("Content").parentElement;
      expect(modalContent?.className).toContain("max-w-md");
    });

    it("applies large size class", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          Content
        </Modal>
      );

      const modalContent = screen.getByText("Content").parentElement;
      expect(modalContent?.className).toContain("max-w-lg");
    });

    it("applies xl size class", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          Content
        </Modal>
      );

      const modalContent = screen.getByText("Content").parentElement;
      expect(modalContent?.className).toContain("max-w-xl");
    });
  });

  describe("body scroll lock", () => {
    it("locks body scroll when opened", async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("hidden");
      });
    });

    it("unlocks body scroll when closed", async () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("hidden");
      });

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          Content
        </Modal>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("");
      });
    });
  });

  describe("accessibility", () => {
    it("has aria-modal attribute", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has dialog role", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Content
        </Modal>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});

describe("ModalFooter", () => {
  it("renders children", () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalFooter>
    );

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("applies border and padding styles", () => {
    render(
      <ModalFooter>
        <button>Action</button>
      </ModalFooter>
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("border-t");
    expect(footer?.className).toContain("pt-4");
  });

  it("applies custom className", () => {
    render(
      <ModalFooter className="custom-footer-class">
        <button>Action</button>
      </ModalFooter>
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("custom-footer-class");
  });

  it("uses flexbox for layout", () => {
    render(
      <ModalFooter>
        <button>Action</button>
      </ModalFooter>
    );

    const footer = screen.getByText("Action").parentElement;
    expect(footer?.className).toContain("flex");
    expect(footer?.className).toContain("justify-end");
    expect(footer?.className).toContain("gap-3");
  });
});
