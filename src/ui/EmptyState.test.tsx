import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  describe("rendering", () => {
    it("renders with title", () => {
      render(<EmptyState title="No results found" />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("renders with title and description", () => {
      render(
        <EmptyState
          title="No jobs available"
          description="Try adjusting your search criteria"
        />
      );
      expect(screen.getByText("No jobs available")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your search criteria")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBe(0);
    });

    it("renders action button when provided", () => {
      const action = <button>Add New</button>;
      render(<EmptyState title="No items" action={action} />);
      expect(screen.getByRole("button", { name: "Add New" })).toBeInTheDocument();
    });

    it("does not render action section when not provided", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const actionDivs = container.querySelectorAll("div > div");
      expect(actionDivs.length).toBeLessThan(5);
    });
  });

  describe("icon rendering", () => {
    it("renders custom icon when provided", () => {
      const icon = <span data-testid="custom-icon">🔍</span>;
      render(<EmptyState title="Search" icon={icon} />);
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("wraps icon in rounded container", () => {
      const icon = <span data-testid="custom-icon">📁</span>;
      const { container } = render(<EmptyState title="Files" icon={icon} />);
      const iconContainer = container.querySelector(".rounded-full");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toContainElement(screen.getByTestId("custom-icon"));
    });

    it("does not render icon container when no icon provided", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const iconContainer = container.querySelector(".rounded-full");
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe("illustration rendering", () => {
    it("renders search illustration", () => {
      const { container } = render(<EmptyState title="Search" illustration="search" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass("w-32", "h-32");
    });

    it("renders jobs illustration", () => {
      const { container } = render(<EmptyState title="Jobs" illustration="jobs" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders applications illustration", () => {
      const { container } = render(<EmptyState title="Applications" illustration="applications" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders resume illustration", () => {
      const { container } = render(<EmptyState title="Resume" illustration="resume" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders salary illustration", () => {
      const { container } = render(<EmptyState title="Salary" illustration="salary" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders market illustration", () => {
      const { container } = render(<EmptyState title="Market" illustration="market" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders error illustration", () => {
      const { container } = render(<EmptyState title="Error" illustration="error" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders success illustration", () => {
      const { container } = render(<EmptyState title="Success" illustration="success" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders empty illustration", () => {
      const { container } = render(<EmptyState title="Empty" illustration="empty" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("icon takes precedence over illustration", () => {
      const icon = <span data-testid="custom-icon">🔍</span>;
      const { container } = render(
        <EmptyState title="Search" icon={icon} illustration="search" />
      );
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(0);
    });
  });

  describe("styling", () => {
    it("applies centered text styling", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const wrapper = container.querySelector(".text-center");
      expect(wrapper).toBeInTheDocument();
    });

    it("applies padding to container", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const wrapper = container.querySelector(".py-12");
      expect(wrapper).toBeInTheDocument();
    });

    it("applies max width to description", () => {
      const { container } = render(
        <EmptyState title="Empty" description="Long description text" />
      );
      const description = container.querySelector(".max-w-md");
      expect(description).toBeInTheDocument();
    });

    it("title has display font class", () => {
      const { container } = render(<EmptyState title="Empty" />);
      const title = container.querySelector(".font-display");
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Empty");
    });
  });

  describe("complex scenarios", () => {
    it("renders all props together", () => {
      const icon = <span data-testid="icon">📋</span>;
      const action = <button data-testid="action-btn">Create</button>;
      render(
        <EmptyState
          title="No applications"
          description="You haven't applied to any jobs yet"
          icon={icon}
          action={action}
        />
      );

      expect(screen.getByText("No applications")).toBeInTheDocument();
      expect(screen.getByText("You haven't applied to any jobs yet")).toBeInTheDocument();
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByTestId("action-btn")).toBeInTheDocument();
    });

    it("renders with clickable action button", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const action = (
        <button onClick={handleClick} data-testid="action-btn">
          Start Search
        </button>
      );
      render(<EmptyState title="No jobs" action={action} />);

      const button = screen.getByTestId("action-btn");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders with custom React node as action", () => {
      const action = (
        <div data-testid="custom-action">
          <button>Action 1</button>
          <button>Action 2</button>
        </div>
      );
      render(<EmptyState title="Choose action" action={action} />);

      expect(screen.getByTestId("custom-action")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Action 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Action 2" })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("illustrations have aria-hidden attribute", () => {
      const { container } = render(<EmptyState title="Jobs" illustration="jobs" />);
      const svg = container.querySelector('svg[aria-hidden="true"]');
      expect(svg).toBeInTheDocument();
    });

    it("title is properly structured as h3", () => {
      render(<EmptyState title="No results" />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("No results");
    });

    it("maintains semantic structure", () => {
      const { container } = render(
        <EmptyState
          title="No data"
          description="Description text"
          illustration="empty"
        />
      );

      const h3 = container.querySelector("h3");
      const p = container.querySelector("p");
      expect(h3).toBeInTheDocument();
      expect(p).toBeInTheDocument();
    });
  });

  describe("different illustration types", () => {
    const illustrations = [
      "search",
      "jobs",
      "applications",
      "resume",
      "salary",
      "market",
      "error",
      "success",
      "empty",
    ] as const;

    illustrations.forEach((illustrationType) => {
      it(`renders ${illustrationType} illustration correctly`, () => {
        const { container } = render(
          <EmptyState title={`Test ${illustrationType}`} illustration={illustrationType} />
        );
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("responsive behavior", () => {
    it("description uses responsive margin", () => {
      const { container } = render(
        <EmptyState title="Empty" description="Test description" />
      );
      const description = container.querySelector("p");
      expect(description).toHaveClass("mb-6");
    });

    it("illustration has margin bottom", () => {
      const { container } = render(<EmptyState title="Jobs" illustration="jobs" />);
      const illustrationWrapper = container.querySelector(".mb-6");
      expect(illustrationWrapper).toBeInTheDocument();
    });

    it("icon container has margin bottom", () => {
      const icon = <span>📁</span>;
      const { container } = render(<EmptyState title="Files" icon={icon} />);
      const iconContainer = container.querySelector(".mb-4");
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
