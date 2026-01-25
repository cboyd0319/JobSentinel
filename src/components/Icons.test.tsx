import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  CloseIcon,
  LocationIcon,
  SalaryIcon,
  SourceIcon,
  ClockIcon,
  ExternalLinkIcon,
  BookmarkIcon,
  NotesIcon,
  ResearchIcon,
  DuplicateIcon,
  HideIcon,
} from "./Icons";

describe("Icons", () => {
  describe("CloseIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });

    it("applies custom className", () => {
      const { container } = render(<CloseIcon className="w-8 h-8 text-red-500" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-8", "h-8", "text-red-500");
    });

    it("has aria-hidden attribute", () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("is exported as memoized component", () => {
      expect(CloseIcon).toBeDefined();
      expect(typeof CloseIcon).toBe("object");
      expect(CloseIcon).toHaveProperty("$$typeof");
    });
  });

  describe("LocationIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<LocationIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<LocationIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });

    it("applies custom className", () => {
      const { container } = render(<LocationIcon className="w-6 h-6" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-6", "h-6");
    });

    it("has aria-hidden attribute", () => {
      const { container } = render(<LocationIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("SalaryIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<SalaryIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<SalaryIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });
  });

  describe("SourceIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<SourceIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("has globe/world icon paths", () => {
      const { container } = render(<SourceIcon />);
      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe("ClockIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<ClockIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<ClockIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });
  });

  describe("ExternalLinkIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<ExternalLinkIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("has arrow/external link path", () => {
      const { container } = render(<ExternalLinkIcon />);
      const path = container.querySelector("path");
      expect(path).toBeInTheDocument();
    });
  });

  describe("BookmarkIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<BookmarkIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<BookmarkIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });

    it("renders unfilled by default", () => {
      const { container } = render(<BookmarkIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "none");
    });

    it("renders filled when filled prop is true", () => {
      const { container } = render(<BookmarkIcon filled />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "currentColor");
    });

    it("supports custom className with filled state", () => {
      const { container } = render(
        <BookmarkIcon filled className="w-8 h-8 text-yellow-500" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-8", "h-8", "text-yellow-500");
      expect(svg).toHaveAttribute("fill", "currentColor");
    });
  });

  describe("NotesIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<NotesIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<NotesIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });

    it("renders unfilled by default", () => {
      const { container } = render(<NotesIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "none");
    });

    it("renders filled when filled prop is true", () => {
      const { container } = render(<NotesIcon filled />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "currentColor");
    });
  });

  describe("ResearchIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<ResearchIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<ResearchIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });

    it("has building/company icon path", () => {
      const { container } = render(<ResearchIcon />);
      const path = container.querySelector("path");
      expect(path).toBeInTheDocument();
    });
  });

  describe("DuplicateIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<DuplicateIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<DuplicateIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-4", "h-4");
    });
  });

  describe("HideIcon", () => {
    it("renders SVG element", () => {
      const { container } = render(<HideIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("applies default className", () => {
      const { container } = render(<HideIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-5", "h-5");
    });

    it("has eye-slash icon path", () => {
      const { container } = render(<HideIcon />);
      const path = container.querySelector("path");
      expect(path).toBeInTheDocument();
    });
  });

  describe("common icon properties", () => {
    it("all icons have viewBox attribute", () => {
      const icons = [
        <CloseIcon key="close" />,
        <LocationIcon key="location" />,
        <SalaryIcon key="salary" />,
        <SourceIcon key="source" />,
        <ClockIcon key="clock" />,
        <ExternalLinkIcon key="external" />,
        <BookmarkIcon key="bookmark" />,
        <NotesIcon key="notes" />,
        <ResearchIcon key="research" />,
        <DuplicateIcon key="duplicate" />,
        <HideIcon key="hide" />,
      ];

      icons.forEach((icon) => {
        const { container } = render(icon);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      });
    });

    it("all icons have stroke attribute", () => {
      const icons = [
        <CloseIcon key="close" />,
        <LocationIcon key="location" />,
        <SalaryIcon key="salary" />,
      ];

      icons.forEach((icon) => {
        const { container } = render(icon);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("stroke", "currentColor");
      });
    });

    it("all icons are accessible with aria-hidden", () => {
      const icons = [
        <CloseIcon key="close" />,
        <LocationIcon key="location" />,
        <BookmarkIcon key="bookmark" />,
      ];

      icons.forEach((icon) => {
        const { container } = render(icon);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("memoization", () => {
    it("all icons are memoized components", () => {
      const icons = [
        CloseIcon,
        LocationIcon,
        SalaryIcon,
        SourceIcon,
        ClockIcon,
        ExternalLinkIcon,
        BookmarkIcon,
        NotesIcon,
        ResearchIcon,
        DuplicateIcon,
        HideIcon,
      ];

      icons.forEach((Icon) => {
        expect(Icon).toBeDefined();
        expect(Icon).toHaveProperty("$$typeof");
      });
    });
  });

  describe("filled prop behavior", () => {
    it("only BookmarkIcon and NotesIcon support filled prop", () => {
      // Filled icons
      const { container: bookmark } = render(<BookmarkIcon filled />);
      const bookmarkSvg = bookmark.querySelector("svg");
      expect(bookmarkSvg).toHaveAttribute("fill", "currentColor");

      const { container: notes } = render(<NotesIcon filled />);
      const notesSvg = notes.querySelector("svg");
      expect(notesSvg).toHaveAttribute("fill", "currentColor");

      // Non-filled icons should always have fill="none"
      const { container: close } = render(<CloseIcon />);
      const closeSvg = close.querySelector("svg");
      expect(closeSvg).toHaveAttribute("fill", "none");
    });
  });

  describe("edge cases", () => {
    it("handles empty className", () => {
      const { container } = render(<CloseIcon className="" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("handles multiple className tokens", () => {
      const { container } = render(
        <LocationIcon className="w-10 h-10 text-blue-500 dark:text-blue-300" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-10", "h-10", "text-blue-500", "dark:text-blue-300");
    });

    it("BookmarkIcon handles both filled and className", () => {
      const { container } = render(
        <BookmarkIcon filled className="w-6 h-6 text-amber-500" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-6", "h-6", "text-amber-500");
      expect(svg).toHaveAttribute("fill", "currentColor");
    });

    it("NotesIcon handles filled=false explicitly", () => {
      const { container } = render(<NotesIcon filled={false} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("fill", "none");
    });
  });

  describe("SVG structure", () => {
    it("CloseIcon has proper stroke properties", () => {
      const { container } = render(<CloseIcon />);
      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
      // Check that at least one path has stroke properties (kebab-case in DOM)
      const hasStrokeProperties = Array.from(paths).some((path) => {
        const strokeLinecap = path.getAttribute("stroke-linecap");
        const strokeLinejoin = path.getAttribute("stroke-linejoin");
        return strokeLinecap && strokeLinejoin;
      });
      expect(hasStrokeProperties).toBe(true);
    });

    it("LocationIcon has stroke width", () => {
      const { container } = render(<LocationIcon />);
      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
      // Check that at least one path has stroke width (kebab-case in DOM)
      const hasStrokeWidth = Array.from(paths).some((path) => {
        const strokeWidth = path.getAttribute("stroke-width");
        return strokeWidth !== null;
      });
      expect(hasStrokeWidth).toBe(true);
    });

    it("SVG elements have consistent structure", () => {
      const { container } = render(<SalaryIcon />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox");
      expect(svg).toHaveAttribute("stroke");
      expect(svg).toHaveAttribute("fill");
    });
  });
});
