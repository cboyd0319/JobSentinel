import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocationHeatmap } from "./LocationHeatmap";

describe("LocationHeatmap", () => {
  const createLocation = (
    overrides: Partial<{
      location: string;
      city: string | null;
      state: string | null;
      total_jobs: number;
      avg_median_salary: number | null;
      remote_percent: number;
    }> = {}
  ) => ({
    location: "Chicago, IL",
    city: "Chicago",
    state: "IL",
    total_jobs: 100,
    avg_median_salary: 82000,
    remote_percent: 50,
    ...overrides,
  });

  const defaultLocations = [
    createLocation({ location: "Chicago, IL", total_jobs: 500 }),
    createLocation({
      location: "Austin, TX",
      city: "Austin",
      state: "TX",
      total_jobs: 450,
    }),
    createLocation({
      location: "Remote",
      city: null,
      state: null,
      total_jobs: 300,
      remote_percent: 100,
    }),
    createLocation({
      location: "Atlanta, GA",
      city: "Atlanta",
      state: "GA",
      total_jobs: 200,
    }),
  ];

  describe("rendering", () => {
    it("renders region with label", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(
        screen.getByRole("region", { name: /Jobs by Location/i })
      ).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("Jobs by Location")).toBeInTheDocument();
    });

    it("renders list of locations", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByRole("list", { name: "Job locations" })).toBeInTheDocument();
    });

    it("renders all location buttons", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      const buttons = screen.getAllByRole("listitem");
      expect(buttons).toHaveLength(4);
    });

    it("renders location names", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("Chicago, IL")).toBeInTheDocument();
      expect(screen.getByText("Austin, TX")).toBeInTheDocument();
      expect(screen.getByText("Atlanta, GA")).toBeInTheDocument();
    });

    it("renders Remote location", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("renders job counts", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("500")).toBeInTheDocument();
      expect(screen.getByText("450")).toBeInTheDocument();
      expect(screen.getByText("300")).toBeInTheDocument();
      expect(screen.getByText("200")).toBeInTheDocument();
    });

    it("renders remote percentage badges when > 0", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      // Multiple locations may have 50% remote (default)
      const fiftyPercentBadges = screen.getAllByText("50% remote");
      expect(fiftyPercentBadges.length).toBeGreaterThan(0);
      // Remote location has 100% remote
      expect(screen.getByText("100% remote")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("renders skeleton loaders when loading", () => {
      render(<LocationHeatmap locations={[]} loading={true} />);

      const skeletons = screen.getByRole("status", { name: /Loading location data/i });
      expect(skeletons).toBeInTheDocument();
      expect(skeletons).toHaveAttribute("aria-busy", "true");
    });

    it("renders title when loading", () => {
      render(<LocationHeatmap locations={[]} loading={true} />);

      expect(screen.getByText("Jobs by Location")).toBeInTheDocument();
    });

    it("does not render locations when loading", () => {
      render(<LocationHeatmap locations={defaultLocations} loading={true} />);

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders empty message when no locations", () => {
      render(<LocationHeatmap locations={[]} />);

      expect(
        screen.getByText("No location trends yet. Refresh hiring trends to see where jobs are showing up.")
      ).toBeInTheDocument();
    });

    it("renders title when empty", () => {
      render(<LocationHeatmap locations={[]} />);

      expect(screen.getByText("Jobs by Location")).toBeInTheDocument();
    });

    it("does not render list when empty", () => {
      render(<LocationHeatmap locations={[]} />);

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("location selection", () => {
    it("does not show details initially", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.queryByRole("region", { name: /Chicago/i })).not.toBeInTheDocument();
    });

    it("shows details when location is clicked", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));

      expect(screen.getByText("Total Jobs")).toBeInTheDocument();
      expect(screen.getByText("Median Salary")).toBeInTheDocument();
      expect(screen.getByText("Remote jobs")).toBeInTheDocument();
      expect(screen.queryByText("Remote %")).not.toBeInTheDocument();
    });

    it("uses cautious location comparison legend copy", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("Compared with other saved locations:")).toBeInTheDocument();
      expect(screen.queryByText("Job Density:")).not.toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "Saved location comparison legend" }),
      ).toBeInTheDocument();
    });

    it("displays selected location job count in details", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));

      // "500" appears both in the button and the detail panel
      const jobCounts = screen.getAllByText("500");
      expect(jobCounts.length).toBeGreaterThanOrEqual(2);
    });

    it("displays selected location salary in details", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));

      expect(screen.getByText("$82,000")).toBeInTheDocument();
    });

    it("displays selected location remote percentage in details", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));

      // In the detail panel, remote % is shown with one decimal
      expect(screen.getByText("50.0%")).toBeInTheDocument();
    });

    it("toggles selection when clicking same location twice", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      const chicagoButton = screen.getByRole("listitem", {
        name: /Chicago, IL: 500 jobs/i,
      });

      fireEvent.click(chicagoButton);
      expect(screen.getByText("Total Jobs")).toBeInTheDocument();

      fireEvent.click(chicagoButton);
      expect(screen.queryByText("Total Jobs")).not.toBeInTheDocument();
    });

    it("switches to different location when clicking another", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));
      expect(screen.getByText("$82,000")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Remote"));
      // Selected location should change, still showing details
      expect(screen.getByText("Total Jobs")).toBeInTheDocument();
    });

    it("has close button that deselects location", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));
      expect(screen.getByText("Total Jobs")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Close location details" }));
      expect(screen.queryByText("Total Jobs")).not.toBeInTheDocument();
    });

    it("sets aria-pressed correctly on selected location", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      const chicagoButton = screen.getByRole("listitem", {
        name: /Chicago, IL: 500 jobs/i,
      });
      expect(chicagoButton).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(chicagoButton);
      expect(chicagoButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("accessibility", () => {
    it("has aria-label on location buttons", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(
        screen.getByRole("listitem", { name: /Chicago, IL: 500 jobs/i })
      ).toBeInTheDocument();
    });

    it("has aria-live on selected location details", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      fireEvent.click(screen.getByText("Chicago, IL"));

      // The detail region should be polite live region
      const detailRegion = screen.getByRole("region", {
        name: /Chicago, IL/i,
      });
      expect(detailRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("legend", () => {
    it("renders legend", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(
        screen.getByRole("img", { name: /Saved location comparison legend/i }),
      ).toBeInTheDocument();
    });

    it("shows all density levels", () => {
      render(<LocationHeatmap locations={defaultLocations} />);

      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Very High")).toBeInTheDocument();
    });
  });

  describe("intensity colors", () => {
    it("applies highest intensity to location with most jobs", () => {
      const locations = [
        createLocation({
          location: "Top City, CA",
          city: "Top City",
          state: "CA",
          total_jobs: 1000,
        }),
        createLocation({
          location: "Low City, NY",
          city: "Low City",
          state: "NY",
          total_jobs: 100,
        }),
      ];

      render(<LocationHeatmap locations={locations} />);

      const buttons = screen.getAllByRole("listitem");
      // First location has 1000 jobs (highest) - should have sentinel color
      expect(buttons[0].className).toContain("bg-sentinel-100");
    });

    it("applies lowest intensity to location with fewest jobs", () => {
      const locations = [
        createLocation({
          location: "Top City, CA",
          city: "Top City",
          state: "CA",
          total_jobs: 1000,
        }),
        createLocation({
          location: "Low City, NY",
          city: "Low City",
          state: "NY",
          total_jobs: 100,
        }),
      ];

      render(<LocationHeatmap locations={locations} />);

      const buttons = screen.getAllByRole("listitem");
      // Second location has 100 jobs (10% of max) - should have surface color
      expect(buttons[1].className).toContain("bg-surface-100");
    });

    it("applies medium intensity to location with moderate jobs", () => {
      const locations = [
        createLocation({
          location: "Top, CA",
          city: "Top",
          state: "CA",
          total_jobs: 1000,
        }),
        createLocation({
          location: "Mid, WA",
          city: "Mid",
          state: "WA",
          total_jobs: 400,
        }),
        createLocation({
          location: "Low, TX",
          city: "Low",
          state: "TX",
          total_jobs: 100,
        }),
      ];

      render(<LocationHeatmap locations={locations} />);

      const buttons = screen.getAllByRole("listitem");
      // Middle location has 400 jobs (40% of max) - should have green color
      expect(buttons[1].className).toContain("bg-green-100");
    });
  });

  describe("formatting", () => {
    it("formats location with city and state", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ city: "Austin", state: "TX", location: "Austin, TX" })]}
        />
      );

      expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    });

    it("formats remote location", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ location: "remote", city: null, state: null })]}
        />
      );

      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("formats location without city/state as raw location", () => {
      render(
        <LocationHeatmap
          locations={[
            createLocation({ location: "Unknown Area", city: null, state: null }),
          ]}
        />
      );

      expect(screen.getByText("Unknown Area")).toBeInTheDocument();
    });

    it("formats salary as currency", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ avg_median_salary: 125000 })]}
        />
      );

      fireEvent.click(screen.getByRole("listitem"));

      expect(screen.getByText("$125,000")).toBeInTheDocument();
    });

    it("shows N/A for null salary", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ avg_median_salary: null })]}
        />
      );

      fireEvent.click(screen.getByRole("listitem"));

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("formats large job counts with commas", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ total_jobs: 12345 })]}
        />
      );

      expect(screen.getByText("12,345")).toBeInTheDocument();
    });

    it("formats remote percent with no decimals in badge", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ remote_percent: 45.7 })]}
        />
      );

      expect(screen.getByText("46% remote")).toBeInTheDocument();
    });

    it("does not show remote badge when remote_percent is 0", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ remote_percent: 0 })]}
        />
      );

      expect(screen.queryByText(/% remote/)).not.toBeInTheDocument();
    });
  });

  describe("single location", () => {
    it("renders single location correctly", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ location: "Chicago, IL", city: "Chicago", state: "IL" })]}
        />
      );

      expect(screen.getByText("Chicago, IL")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("selects single location on click", () => {
      render(
        <LocationHeatmap
          locations={[createLocation({ location: "Chicago, IL", city: "Chicago", state: "IL" })]}
        />
      );

      fireEvent.click(screen.getByRole("listitem"));

      expect(screen.getByText("Total Jobs")).toBeInTheDocument();
    });
  });
});
