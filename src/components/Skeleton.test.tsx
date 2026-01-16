import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Skeleton,
  SkeletonCard,
  SkeletonJobCard,
  SkeletonStatCard,
  SkeletonJobList,
  DashboardSkeleton,
} from "./Skeleton";

describe("Skeleton", () => {
  describe("basic rendering", () => {
    it("renders skeleton with default props", () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse", "bg-surface-200");
    });

    it("applies text variant by default", () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveClass("rounded", "h-4");
    });

    it("applies custom className", () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.querySelector(".custom-class");
      expect(skeleton).toBeInTheDocument();
    });

    it("has animate-pulse class for loading animation", () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("variant rendering", () => {
    it("renders text variant", () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveClass("rounded", "h-4");
    });

    it("renders circular variant", () => {
      const { container } = render(<Skeleton variant="circular" width={40} height={40} />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveClass("rounded-full");
    });

    it("renders rectangular variant", () => {
      const { container } = render(<Skeleton variant="rectangular" />);
      const skeleton = container.querySelector("div");
      expect(skeleton).not.toHaveClass("rounded");
      expect(skeleton).not.toHaveClass("rounded-lg");
    });

    it("renders rounded variant", () => {
      const { container } = render(<Skeleton variant="rounded" />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveClass("rounded-lg");
    });
  });

  describe("dimensions", () => {
    it("applies custom width", () => {
      const { container } = render(<Skeleton width={200} />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ width: "200px" });
    });

    it("applies custom height", () => {
      const { container } = render(<Skeleton height={50} />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ height: "50px" });
    });

    it("applies width as string", () => {
      const { container } = render(<Skeleton width="60%" />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ width: "60%" });
    });

    it("applies height as string", () => {
      const { container } = render(<Skeleton height="2rem" />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ height: "2rem" });
    });

    it("circular variant uses height for width when width not specified", () => {
      const { container } = render(<Skeleton variant="circular" height={50} />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ width: "50px", height: "50px" });
    });

    it("circular variant uses width for height when height not specified", () => {
      const { container } = render(<Skeleton variant="circular" width={60} />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveStyle({ width: "60px", height: "60px" });
    });
  });

  describe("multiple lines", () => {
    it("renders single line by default", () => {
      const { container } = render(<Skeleton />);
      const lines = container.querySelectorAll("div.animate-pulse");
      expect(lines.length).toBe(1);
    });

    it("renders multiple lines when lines > 1", () => {
      const { container } = render(<Skeleton lines={3} />);
      const lines = container.querySelectorAll("div.animate-pulse");
      expect(lines.length).toBe(3);
    });

    it("applies space-y class to multi-line container", () => {
      const { container } = render(<Skeleton lines={3} />);
      const wrapper = container.querySelector(".space-y-2");
      expect(wrapper).toBeInTheDocument();
    });

    it("last line is 75% width", () => {
      const { container } = render(<Skeleton lines={3} width="100%" />);
      const lines = container.querySelectorAll("div.animate-pulse");
      const lastLine = lines[2] as HTMLElement;
      expect(lastLine).toHaveStyle({ width: "75%" });
    });

    it("non-last lines have full width", () => {
      const { container } = render(<Skeleton lines={3} width="100%" />);
      const lines = container.querySelectorAll("div.animate-pulse");
      const firstLine = lines[0] as HTMLElement;
      const secondLine = lines[1] as HTMLElement;
      expect(firstLine).toHaveStyle({ width: "100%" });
      expect(secondLine).toHaveStyle({ width: "100%" });
    });

    it("only applies multi-line for text variant", () => {
      const { container } = render(<Skeleton variant="circular" lines={3} />);
      const lines = container.querySelectorAll("div.animate-pulse");
      expect(lines.length).toBe(1);
    });
  });

  describe("dark mode support", () => {
    it("has dark mode background class", () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector("div");
      expect(skeleton).toHaveClass("dark:bg-surface-700");
    });
  });
});

describe("SkeletonCard", () => {
  it("renders card container with border", () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector(".border");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("rounded-card");
  });

  it("renders circular avatar skeleton", () => {
    const { container } = render(<SkeletonCard />);
    const circular = container.querySelector(".rounded-full");
    expect(circular).toBeInTheDocument();
  });

  it("renders multiple text skeletons", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it("has flex layout", () => {
    const { container } = render(<SkeletonCard />);
    const flex = container.querySelector(".flex");
    expect(flex).toBeInTheDocument();
  });
});

describe("SkeletonJobCard", () => {
  it("renders job card with rounded border", () => {
    const { container } = render(<SkeletonJobCard />);
    const card = container.querySelector(".rounded-card");
    expect(card).toBeInTheDocument();
  });

  it("renders circular score display skeleton", () => {
    const { container } = render(<SkeletonJobCard />);
    const circular = container.querySelector(".rounded-full");
    expect(circular).toBeInTheDocument();
  });

  it("renders multiple skeleton elements for job details", () => {
    const { container } = render(<SkeletonJobCard />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it("has padding", () => {
    const { container } = render(<SkeletonJobCard />);
    const card = container.querySelector(".p-5");
    expect(card).toBeInTheDocument();
  });

  it("renders action button skeleton", () => {
    const { container } = render(<SkeletonJobCard />);
    const rounded = container.querySelector(".rounded-lg");
    expect(rounded).toBeInTheDocument();
  });
});

describe("SkeletonStatCard", () => {
  it("renders stat card container", () => {
    const { container } = render(<SkeletonStatCard />);
    const card = container.querySelector(".rounded-card");
    expect(card).toBeInTheDocument();
  });

  it("has justify-between layout", () => {
    const { container } = render(<SkeletonStatCard />);
    const flex = container.querySelector(".justify-between");
    expect(flex).toBeInTheDocument();
  });

  it("renders multiple skeletons for stat data", () => {
    const { container } = render(<SkeletonStatCard />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(2);
  });

  it("has padding", () => {
    const { container } = render(<SkeletonStatCard />);
    const card = container.querySelector(".p-6");
    expect(card).toBeInTheDocument();
  });
});

describe("SkeletonJobList", () => {
  it("renders default count of 5 job cards", () => {
    const { container } = render(<SkeletonJobList />);
    const cards = container.querySelectorAll(".rounded-card");
    expect(cards.length).toBe(5);
  });

  it("renders custom count of job cards", () => {
    const { container } = render(<SkeletonJobList count={3} />);
    const cards = container.querySelectorAll(".rounded-card");
    expect(cards.length).toBe(3);
  });

  it("renders cards with spacing", () => {
    const { container } = render(<SkeletonJobList />);
    const wrapper = container.querySelector(".space-y-3");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders 10 job cards when count is 10", () => {
    const { container } = render(<SkeletonJobList count={10} />);
    const cards = container.querySelectorAll(".rounded-card");
    expect(cards.length).toBe(10);
  });

  it("renders single job card when count is 1", () => {
    const { container } = render(<SkeletonJobList count={1} />);
    const cards = container.querySelectorAll(".rounded-card");
    expect(cards.length).toBe(1);
  });
});

describe("DashboardSkeleton", () => {
  it("renders full page skeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const page = container.querySelector(".min-h-screen");
    expect(page).toBeInTheDocument();
  });

  it("renders header section", () => {
    const { container } = render(<DashboardSkeleton />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("sticky", "top-0");
  });

  it("renders main content area", () => {
    const { container } = render(<DashboardSkeleton />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
  });

  it("renders stat cards grid", () => {
    const { container } = render(<DashboardSkeleton />);
    const statCards = container.querySelectorAll(".grid > .p-6");
    expect(statCards.length).toBeGreaterThan(2);
  });

  it("renders navigation buttons skeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const navButtons = container.querySelectorAll(".grid-cols-2");
    expect(navButtons.length).toBeGreaterThan(0);
  });

  it("renders job list skeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const jobCards = container.querySelectorAll(".space-y-3");
    expect(jobCards.length).toBeGreaterThan(0);
  });

  it("has max-width container", () => {
    const { container } = render(<DashboardSkeleton />);
    const maxWidthContainers = container.querySelectorAll(".max-w-7xl");
    expect(maxWidthContainers.length).toBeGreaterThan(0);
  });

  it("renders status card skeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const statusCard = container.querySelector(".grid-cols-3");
    expect(statusCard).toBeInTheDocument();
  });

  it("has responsive grid layout", () => {
    const { container } = render(<DashboardSkeleton />);
    const responsiveGrids = container.querySelectorAll(".md\\:grid-cols-3");
    expect(responsiveGrids.length).toBeGreaterThan(0);
  });

  it("renders multiple skeleton types", () => {
    const { container } = render(<DashboardSkeleton />);
    const allSkeletons = container.querySelectorAll(".animate-pulse");
    expect(allSkeletons.length).toBeGreaterThan(20);
  });
});

describe("Skeleton accessibility", () => {
  it("maintains semantic structure in SkeletonCard", () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector(".p-6");
    expect(card).toBeInTheDocument();
  });

  it("maintains semantic structure in DashboardSkeleton", () => {
    const { container } = render(<DashboardSkeleton />);
    const header = container.querySelector("header");
    const main = container.querySelector("main");
    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });
});

describe("Skeleton styling consistency", () => {
  it("all skeleton components use consistent base styles", () => {
    const { container: card } = render(<SkeletonCard />);
    const { container: jobCard } = render(<SkeletonJobCard />);
    const { container: statCard } = render(<SkeletonStatCard />);

    const cardSkeletons = card.querySelectorAll(".animate-pulse");
    const jobCardSkeletons = jobCard.querySelectorAll(".animate-pulse");
    const statCardSkeletons = statCard.querySelectorAll(".animate-pulse");

    expect(cardSkeletons.length).toBeGreaterThan(0);
    expect(jobCardSkeletons.length).toBeGreaterThan(0);
    expect(statCardSkeletons.length).toBeGreaterThan(0);
  });

  it("all cards use consistent border styles", () => {
    const { container: card } = render(<SkeletonCard />);
    const { container: jobCard } = render(<SkeletonJobCard />);
    const { container: statCard } = render(<SkeletonStatCard />);

    expect(card.querySelector(".border")).toBeInTheDocument();
    expect(jobCard.querySelector(".border")).toBeInTheDocument();
    expect(statCard.querySelector(".border")).toBeInTheDocument();
  });
});
