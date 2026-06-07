import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal, ModalFooter } from "./Modal";
import { resetBodyScrollLocksForTests } from "../utils/bodyScrollLock";

describe("Modal", () => {
  beforeEach(() => {
    resetBodyScrollLocksForTests();
  });

  afterEach(() => {
    resetBodyScrollLocksForTests();
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

    it("renders inside the app tree with a viewport-fixed overlay", () => {
      render(
        <div data-testid="parent">
          <Modal isOpen={true} onClose={vi.fn()}>
            Content
          </Modal>
        </div>
      );

      const parent = screen.getByTestId("parent");
      const dialog = screen.getByRole("dialog");

      expect(parent.contains(dialog)).toBe(true);
      expect(dialog).toHaveClass("app-modal-overlay", "fixed", "inset-0");
      expect(dialog).toHaveStyle({
        position: "fixed",
        zIndex: "1000",
      });
    });

    it("uses deterministic modal paint classes instead of animation-only visibility", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Stable modal">
          Content
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      const backdrop = dialog.querySelector('[aria-hidden="true"]');
      const panel = screen.getByText("Content").closest(".app-modal-panel");

      expect(backdrop).toHaveClass("app-modal-backdrop");
      expect(backdrop).not.toHaveClass("motion-safe:animate-fade-in");
      expect(panel).toHaveClass("app-modal-panel");
      expect(panel).not.toHaveClass("motion-safe:animate-slide-up");
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
      const title = screen.getByRole("heading", { name: "Test Title" });
      expect(dialog).toHaveAttribute("aria-labelledby", title.id);
    });

    it("sets aria-describedby when description is provided", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} description="Test description">
          Content
        </Modal>
      );

      const dialog = screen.getByRole("dialog");
      const description = screen.getByText("Test description");
      expect(dialog).toHaveAttribute("aria-describedby", description.id);
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

    it("keeps tall modal content inside the viewport with an internal scroll area", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <div>Tall modal content</div>
        </Modal>
      );

      const content = screen.getByText("Tall modal content");
      const scrollArea = content.parentElement;
      const modalContent = scrollArea?.parentElement;

      expect(modalContent?.className).toContain("max-h-[calc(100dvh-2rem)]");
      expect(modalContent?.className).toContain("overflow-hidden");
      expect(scrollArea?.className).toContain("overflow-y-auto");
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

    it("keeps body scroll locked while another modal remains open", async () => {
      const { rerender } = render(
        <>
          <Modal isOpen={true} onClose={vi.fn()}>
            Outer content
          </Modal>
          <Modal isOpen={true} onClose={vi.fn()}>
            Inner content
          </Modal>
        </>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("hidden");
      });

      rerender(
        <>
          <Modal isOpen={true} onClose={vi.fn()}>
            Outer content
          </Modal>
          <Modal isOpen={false} onClose={vi.fn()}>
            Inner content
          </Modal>
        </>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("hidden");
      });

      rerender(
        <>
          <Modal isOpen={false} onClose={vi.fn()}>
            Outer content
          </Modal>
          <Modal isOpen={false} onClose={vi.fn()}>
            Inner content
          </Modal>
        </>
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
