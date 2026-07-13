import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "./Badge";

describe("Badge", () => {
  describe("rendering", () => {
    it("renders with children text", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("renders as a span element", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("Test");
    });

    it("has inline-flex display class", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("inline-flex");
    });
  });

  describe("variants", () => {
    it("renders with default variant (surface)", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-surface-100", "text-surface-600");
    });

    it("renders with sentinel variant", () => {
      const { container } = render(<Badge variant="sentinel">Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-sentinel-100", "text-sentinel-700");
    });

    it("renders with alert variant", () => {
      const { container } = render(<Badge variant="alert">Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-alert-100", "text-alert-700");
    });

    it("renders with success variant", () => {
      const { container } = render(<Badge variant="success">Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-success/10", "text-success");
    });

    it("renders with danger variant", () => {
      const { container } = render(<Badge variant="danger">Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-danger/10", "text-danger");
    });
  });

  describe("sizes", () => {
    it("renders with default size (md)", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("px-2.5", "py-1", "text-sm");
    });

    it("renders with small size", () => {
      const { container } = render(<Badge size="sm">Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("px-2", "py-0.5", "text-xs");
    });
  });

  describe("removable badge", () => {
    it("does not show remove button by default", () => {
      render(<Badge>Test</Badge>);
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });

    it("shows remove button when removable is true", () => {
      render(<Badge removable>Test</Badge>);
      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });

    it("calls onRemove when remove button is clicked", async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();
      render(
        <Badge removable onRemove={handleRemove}>
          Test
        </Badge>
      );

      const removeButton = screen.getByRole("button", { name: /remove/i });
      await user.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it("remove button has hover styles", () => {
      render(<Badge removable>Test</Badge>);
      const removeButton = screen.getByRole("button", { name: /remove/i });
      expect(removeButton).toHaveClass("hover:bg-black/10");
    });

    it("remove button icon has aria-hidden", () => {
      render(<Badge removable>Test</Badge>);
      const removeButton = screen.getByRole("button", { name: /remove/i });
      const icon = removeButton.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it("does not call onRemove when badge is not removable", async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();
      const { container } = render(
        <Badge removable={false} onRemove={handleRemove}>
          Test
        </Badge>
      );

      // There should be no button to click
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      // Try clicking the badge itself
      const badge = container.querySelector("span");
      if (badge) {
        await user.click(badge);
      }

      expect(handleRemove).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("remove button has contextual accessible label", () => {
      render(<Badge removable>Test</Badge>);
      const removeButton = screen.getByRole("button", { name: "Remove Test" });
      expect(removeButton).toHaveAttribute("aria-label", "Remove Test");
    });

    it("remove button uses 'badge' for non-string children", () => {
      render(<Badge removable><span>Icon</span></Badge>);
      const removeButton = screen.getByRole("button", { name: "Remove badge" });
      expect(removeButton).toHaveAttribute("aria-label", "Remove badge");
    });

    it("remove button can be keyboard activated", async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();
      render(
        <Badge removable onRemove={handleRemove}>
          Test
        </Badge>
      );

      const removeButton = screen.getByRole("button", { name: /remove/i });
      removeButton.focus();
      await user.keyboard("{Enter}");

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("styling", () => {
    it("has rounded-full class", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("rounded-full");
    });

    it("has font-medium class", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("font-medium");
    });

    it("has items-center class for vertical alignment", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("items-center");
    });

    it("has gap class when removable", () => {
      const { container } = render(<Badge removable>Test</Badge>);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("gap-1");
    });
  });

  describe("complex content", () => {
    it("renders with React node children", () => {
      render(
        <Badge>
          <span data-testid="icon">★</span>
          <span>Premium</span>
        </Badge>
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Premium")).toBeInTheDocument();
    });

    it("renders removable badge with complex content", () => {
      render(
        <Badge removable>
          <span data-testid="icon">★</span>
          <span>Premium</span>
        </Badge>
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Premium")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });
  });
});
