import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
    });

    it("does not show tooltip initially", () => {
      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("renders ReactNode content", () => {
      render(
        <Tooltip content={<span>Rich <strong>content</strong></span>}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      expect(button).toBeInTheDocument();
    });
  });

  describe("mouse interaction", () => {
    it("shows tooltip on mouse enter after delay", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      // Wait for delay to pass
      await waitFor(
        () => {
          expect(screen.getByRole("tooltip")).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip text");
    });

    it("hides tooltip on mouse leave", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      await user.unhover(button);

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    it("respects custom delay", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={300}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      // Should show after delay
      await waitFor(
        () => {
          expect(screen.getByRole("tooltip")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it("uses default delay of 200ms", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text">
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      // Should show after default delay
      await waitFor(
        () => {
          expect(screen.getByRole("tooltip")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe("focus interaction", () => {
    it("shows tooltip on focus after delay", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Focus me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Focus me" });
      await user.click(button); // This also focuses

      await waitFor(
        () => {
          expect(screen.getByRole("tooltip")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it("hides tooltip on blur", async () => {
      const user = userEvent.setup();

      render(
        <>
          <Tooltip content="Tooltip text" delay={100}>
            <button>Focus me</button>
          </Tooltip>
          <button>Other button</button>
        </>
      );

      const button = screen.getByRole("button", { name: "Focus me" });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Tab to next element to blur
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });
  });

  describe("positioning", () => {
    it("positions tooltip on top by default", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("bottom-full");
      });
    });

    it("positions tooltip on bottom when specified", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" position="bottom" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("top-full");
      });
    });

    it("positions tooltip on left when specified", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" position="left" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("right-full");
      });
    });

    it("positions tooltip on right when specified", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" position="right" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("left-full");
      });
    });
  });

  describe("styling", () => {
    it("has proper background and text color", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("bg-surface-800");
        expect(tooltip).toHaveClass("text-white");
      });
    });

    it("has rounded corners and padding", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("rounded-lg");
        expect(tooltip).toHaveClass("px-3", "py-2");
      });
    });

    it("has shadow and animation", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveClass("shadow-lg");
        expect(tooltip).toHaveClass("animate-fade-in");
      });
    });
  });

  describe("accessibility", () => {
    it("has tooltip role", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveAttribute("role", "tooltip");
      });
    });

    it("is keyboard accessible via focus", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Tooltip text" delay={100}>
          <button>Tab to me</button>
        </Tooltip>
      );

      await user.tab();

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });
  });

  describe("edge cases", () => {
    it("handles empty content string", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("");
      });
    });

    it("handles complex ReactNode content", async () => {
      const user = userEvent.setup();

      render(
        <Tooltip
          content={
            <div>
              <strong>Bold</strong> and <em>italic</em>
            </div>
          }
          delay={100}
        >
          <button>Hover me</button>
        </Tooltip>
      );

      const button = screen.getByRole("button", { name: "Hover me" });
      await user.hover(button);

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip.querySelector("strong")).toHaveTextContent("Bold");
        expect(tooltip.querySelector("em")).toHaveTextContent("italic");
      });
    });
  });
});

