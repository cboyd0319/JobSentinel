import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Card, CardHeader, CardDivider } from "./Card";

describe("Card", () => {
  describe("basic rendering", () => {
    it("renders children", () => {
      render(<Card>Card content</Card>);

      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("applies base styling classes", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("bg-white");
      expect(card.className).toContain("rounded-card");
      expect(card.className).toContain("border");
    });
  });

  describe("padding", () => {
    it("applies medium padding by default", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("p-6");
    });

    it("applies no padding when padding is none", () => {
      render(<Card padding="none">Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).not.toContain("p-4");
      expect(card.className).not.toContain("p-6");
      expect(card.className).not.toContain("p-8");
    });

    it("applies small padding", () => {
      render(<Card padding="sm">Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("p-4");
    });

    it("applies large padding", () => {
      render(<Card padding="lg">Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("p-8");
    });
  });

  describe("hover behavior", () => {
    it("does not have hover styles by default", () => {
      render(<Card>Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).not.toContain("hover:shadow-card-hover");
    });

    it("applies hover styles when hover prop is true", () => {
      render(<Card hover>Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("hover:shadow-card-hover");
      expect(card.className).toContain("hover:-translate-y-0.5");
    });
  });

  describe("interactive behavior", () => {
    it("becomes interactive when onClick is provided", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      const card = screen.getByText("Clickable");
      expect(card).toHaveAttribute("role", "button");
      expect(card).toHaveAttribute("tabIndex", "0");
      expect(card.className).toContain("cursor-pointer");
    });

    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      fireEvent.click(screen.getByText("Clickable"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Enter key press", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      const card = screen.getByText("Clickable");
      fireEvent.keyDown(card, { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Space key press", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      const card = screen.getByText("Clickable");
      fireEvent.keyDown(card, { key: " " });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick on other key presses", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      const card = screen.getByText("Clickable");
      fireEvent.keyDown(card, { key: "Tab" });
      expect(onClick).not.toHaveBeenCalled();
    });

    it("applies hover styles when interactive", () => {
      const onClick = vi.fn();
      render(<Card onClick={onClick}>Clickable</Card>);

      const card = screen.getByText("Clickable");
      expect(card.className).toContain("hover:shadow-card-hover");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      render(<Card className="my-custom-class">Content</Card>);

      const card = screen.getByText("Content");
      expect(card.className).toContain("my-custom-class");
    });
  });

  describe("aria props", () => {
    it("passes through aria props", () => {
      render(
        <Card aria-label="Test card" aria-describedby="desc">
          Content
        </Card>
      );

      const card = screen.getByText("Content");
      expect(card).toHaveAttribute("aria-label", "Test card");
      expect(card).toHaveAttribute("aria-describedby", "desc");
    });

    it("allows custom role to override default", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick} role="listitem">
          Content
        </Card>
      );

      const card = screen.getByRole("listitem");
      expect(card).toBeInTheDocument();
    });
  });
});

describe("CardHeader", () => {
  it("renders title", () => {
    render(<CardHeader title="Test Title" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("renders title as h3", () => {
    render(<CardHeader title="Test Title" />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Test Title");
  });

  it("renders subtitle when provided", () => {
    render(<CardHeader title="Title" subtitle="Test subtitle" />);

    expect(screen.getByText("Test subtitle")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<CardHeader title="Title" />);

    // Only the title should be present
    expect(screen.queryByText("subtitle")).not.toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);

    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });
});

describe("CardDivider", () => {
  it("renders a separator", () => {
    render(<CardDivider />);

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("applies border classes", () => {
    render(<CardDivider />);

    const hr = screen.getByRole("separator");
    expect(hr.className).toContain("border-surface-100");
    expect(hr.className).toContain("my-4");
  });
});
