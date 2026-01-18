import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipToContent } from "./SkipToContent";

describe("SkipToContent", () => {
  describe("rendering", () => {
    it("renders a skip link", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
    });

    it("has correct href pointing to main content", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveAttribute("href", "#main-content");
    });
  });

  describe("visibility", () => {
    it("is visually hidden by default (sr-only)", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("sr-only");
    });

    it("becomes visible on focus", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:not-sr-only");
    });
  });

  describe("positioning", () => {
    it("is positioned fixed", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("fixed");
    });

    it("is positioned at top-left", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("top-4", "left-4");
    });

    it("has high z-index for visibility", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("z-50");
    });
  });

  describe("styling", () => {
    it("has sentinel brand color background", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("bg-sentinel-500");
    });

    it("has white text color", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("text-white");
    });

    it("has proper padding", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("px-4", "py-2");
    });

    it("has rounded corners", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("rounded-lg");
    });

    it("has medium font weight", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("font-medium");
    });
  });

  describe("accessibility", () => {
    it("is keyboard accessible", async () => {
      const user = userEvent.setup();

      render(
        <>
          <SkipToContent />
          <button>Another element</button>
        </>
      );

      // Tab to the skip link
      await user.tab();

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveFocus();
    });

    it("has focus ring styles", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:ring-2");
      expect(link).toHaveClass("focus:ring-sentinel-500");
    });

    it("has focus ring offset", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:ring-offset-2");
    });

    it("removes default outline", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:outline-none");
    });

    it("is the first focusable element on the page", async () => {
      const user = userEvent.setup();

      render(
        <>
          <SkipToContent />
          <button>Button 1</button>
          <button>Button 2</button>
        </>
      );

      // First tab should focus skip link
      await user.tab();

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveFocus();
    });
  });

  describe("keyboard navigation", () => {
    it("can be activated with Enter key", async () => {
      const user = userEvent.setup();

      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      link.focus();

      await user.keyboard("{Enter}");
      // Link should remain a valid element after activation
      expect(link).toBeInTheDocument();
    });

    it("can be focused and unfocused", async () => {
      const user = userEvent.setup();

      render(
        <>
          <SkipToContent />
          <button>Next element</button>
        </>
      );

      const link = screen.getByRole("link", { name: /skip to main content/i });
      const button = screen.getByRole("button", { name: /next element/i });

      // Tab to skip link
      await user.tab();
      expect(link).toHaveFocus();

      // Tab to next element
      await user.tab();
      expect(button).toHaveFocus();
      expect(link).not.toHaveFocus();
    });
  });

  describe("integration", () => {
    it("works with main content element", () => {
      render(
        <>
          <SkipToContent />
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </>
      );

      const link = screen.getByRole("link", { name: /skip to main content/i });
      const mainContent = screen.getByRole("main");

      expect(link).toHaveAttribute("href", "#main-content");
      expect(mainContent).toHaveAttribute("id", "main-content");
    });

    it("link href matches main content id", () => {
      render(
        <>
          <SkipToContent />
          <div id="main-content">Content</div>
        </>
      );

      const link = screen.getByRole("link", { name: /skip to main content/i });
      const content = screen.getByText("Content");

      expect(link.getAttribute("href")).toBe(`#${content.getAttribute("id")}`);
    });
  });

  describe("text content", () => {
    it("displays correct text", () => {
      render(<SkipToContent />);

      expect(screen.getByText("Skip to main content")).toBeInTheDocument();
    });

    it("text is accessible to screen readers", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link.textContent).toBe("Skip to main content");
    });
  });

  describe("WCAG compliance", () => {
    it("provides bypass blocks mechanism (WCAG 2.4.1)", () => {
      // The skip link allows users to bypass repeated content
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "#main-content");
    });

    it("is perceivable when focused (WCAG 1.4.1)", () => {
      // The skip link becomes visible on focus
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:not-sr-only");
    });

    it("has sufficient color contrast (WCAG 1.4.3)", () => {
      // White text on sentinel-500 background
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("bg-sentinel-500", "text-white");
    });

    it("is keyboard accessible (WCAG 2.1.1)", async () => {
      const user = userEvent.setup();

      render(<SkipToContent />);

      // Can be accessed via keyboard
      await user.tab();
      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveFocus();
    });

    it("has visible focus indicator (WCAG 2.4.7)", () => {
      render(<SkipToContent />);

      const link = screen.getByRole("link", { name: /skip to main content/i });
      expect(link).toHaveClass("focus:ring-2");
    });
  });

  describe("multiple instances", () => {
    it("can render multiple skip links without conflict", () => {
      render(
        <>
          <SkipToContent />
          <SkipToContent />
        </>
      );

      const links = screen.getAllByRole("link", { name: /skip to main content/i });
      expect(links).toHaveLength(2);
    });
  });
});
