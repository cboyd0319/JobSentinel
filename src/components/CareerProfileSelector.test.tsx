import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CareerProfileSelector } from "./CareerProfileSelector";
import { CAREER_PROFILES } from "../utils/profiles";

describe("CareerProfileSelector", () => {
  const defaultProps = {
    selectedProfile: null,
    onSelectProfile: vi.fn(),
  };

  describe("rendering", () => {
    it("renders radiogroup", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("has aria-label on radiogroup", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByRole("radiogroup")).toHaveAttribute(
        "aria-label",
        "Select career profile"
      );
    });

    it("renders all career profiles", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      for (const profile of CAREER_PROFILES) {
        expect(screen.getByText(profile.name)).toBeInTheDocument();
      }
    });

    it("renders profile descriptions", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      for (const profile of CAREER_PROFILES) {
        expect(screen.getByText(profile.description)).toBeInTheDocument();
      }
    });

    it("renders salary ranges for all profiles", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      // Use getAllByText since some profiles may share the same salary range
      const uniqueRanges = [...new Set(CAREER_PROFILES.map(p => p.salaryRange))];
      for (const range of uniqueRanges) {
        const elements = screen.getAllByText(range);
        expect(elements.length).toBeGreaterThan(0);
      }
    });

    it("renders Custom Setup option", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Custom Setup")).toBeInTheDocument();
      expect(
        screen.getByText("I'll enter my own job titles and skills")
      ).toBeInTheDocument();
    });
  });

  describe("radio buttons", () => {
    it("renders radio buttons for each profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      const radios = screen.getAllByRole("radio");
      // All profiles + Custom Setup option
      expect(radios).toHaveLength(CAREER_PROFILES.length + 1);
    });

    it("has aria-label on each profile card", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      for (const profile of CAREER_PROFILES) {
        expect(
          screen.getByRole("radio", {
            name: `${profile.name}: ${profile.description}`,
          })
        ).toBeInTheDocument();
      }
    });

    it("has aria-label on Custom Setup option", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(
        screen.getByRole("radio", {
          name: "Custom Setup: I'll enter my own job titles and skills",
        })
      ).toBeInTheDocument();
    });

    it("marks no profile as checked when selectedProfile is null", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      // Custom Setup should be checked when selectedProfile is null
      const customSetup = screen.getByRole("radio", {
        name: "Custom Setup: I'll enter my own job titles and skills",
      });
      expect(customSetup).toHaveAttribute("aria-checked", "true");

      // Other profiles should not be checked
      for (const profile of CAREER_PROFILES) {
        const radio = screen.getByRole("radio", {
          name: `${profile.name}: ${profile.description}`,
        });
        expect(radio).toHaveAttribute("aria-checked", "false");
      }
    });

    it("marks selected profile as checked", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const selectedRadio = screen.getByRole("radio", {
        name: "Software & Tech: Engineers, developers, DevOps, and SRE roles",
      });
      expect(selectedRadio).toHaveAttribute("aria-checked", "true");
    });

    it("marks Custom Setup as not checked when profile is selected", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const customSetup = screen.getByRole("radio", {
        name: "Custom Setup: I'll enter my own job titles and skills",
      });
      expect(customSetup).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("selection", () => {
    it("calls onSelectProfile when clicking a profile card", () => {
      const onSelectProfile = vi.fn();
      render(
        <CareerProfileSelector {...defaultProps} onSelectProfile={onSelectProfile} />
      );

      fireEvent.click(screen.getByText("Software & Tech"));

      expect(onSelectProfile).toHaveBeenCalledWith("software-engineering");
    });

    it("calls onSelectProfile with null when clicking Custom Setup", () => {
      const onSelectProfile = vi.fn();
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
          onSelectProfile={onSelectProfile}
        />
      );

      fireEvent.click(screen.getByText("Custom Setup"));

      expect(onSelectProfile).toHaveBeenCalledWith(null);
    });

    it("calls onSelectProfile for Security profile", () => {
      const onSelectProfile = vi.fn();
      render(
        <CareerProfileSelector {...defaultProps} onSelectProfile={onSelectProfile} />
      );

      fireEvent.click(screen.getByText("Security"));

      expect(onSelectProfile).toHaveBeenCalledWith("cybersecurity");
    });

    it("calls onSelectProfile for Data & Analytics profile", () => {
      const onSelectProfile = vi.fn();
      render(
        <CareerProfileSelector {...defaultProps} onSelectProfile={onSelectProfile} />
      );

      fireEvent.click(screen.getByText("Data & Analytics"));

      expect(onSelectProfile).toHaveBeenCalledWith("data-science");
    });
  });

  describe("SelectedProfilePreview", () => {
    it("does not show preview when no profile is selected", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.queryByText("You'll see jobs like:")).not.toBeInTheDocument();
    });

    it("shows preview when profile is selected", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      expect(screen.getByText("You'll see jobs like:")).toBeInTheDocument();
    });

    it("has aria-live polite on preview", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const preview = screen.getByRole("region", {
        name: /You'll see jobs like/i,
      });
      expect(preview).toHaveAttribute("aria-live", "polite");
    });

    it("displays sample job titles", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      // Software engineering profile has these sample titles
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("DevOps Engineer")).toBeInTheDocument();
      expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    });

    it("displays sample titles list with listitem role", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const listitems = screen.getAllByRole("listitem");
      expect(listitems.length).toBeGreaterThan(0);
    });

    it("shows count of additional titles", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      // The profile has more titles than sample titles
      const profile = CAREER_PROFILES.find(p => p.id === "software-engineering")!;
      const additionalCount = profile.titleAllowlist.length - profile.sampleTitles.length;

      expect(screen.getByText(`+ ${additionalCount} more`)).toBeInTheDocument();
    });

    it("shows count of relevant skills", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const profile = CAREER_PROFILES.find(p => p.id === "software-engineering")!;
      expect(
        screen.getByText(`Pre-configured with ${profile.keywordsBoost.length} relevant skills`)
      ).toBeInTheDocument();
    });

    it("updates preview when different profile is selected", () => {
      const { rerender } = render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      expect(screen.getByText("Software Engineer")).toBeInTheDocument();

      rerender(
        <CareerProfileSelector {...defaultProps} selectedProfile="cybersecurity" />
      );

      expect(screen.getByText("Security Engineer")).toBeInTheDocument();
      expect(screen.getByText("AppSec Engineer")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies selected styling to selected profile", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const selectedRadio = screen.getByRole("radio", {
        name: "Software & Tech: Engineers, developers, DevOps, and SRE roles",
      });
      expect(selectedRadio.className).toContain("border-sentinel-500");
      expect(selectedRadio.className).toContain("bg-sentinel-50");
    });

    it("applies default styling to unselected profiles", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      const radio = screen.getByRole("radio", {
        name: "Software & Tech: Engineers, developers, DevOps, and SRE roles",
      });
      expect(radio.className).toContain("border-surface-200");
    });

    it("applies selected styling to Custom Setup when null selected", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      const customSetup = screen.getByRole("radio", {
        name: "Custom Setup: I'll enter my own job titles and skills",
      });
      expect(customSetup.className).toContain("border-surface-400");
      expect(customSetup.className).toContain("bg-surface-100");
    });

    it("applies unselected styling to Custom Setup when profile selected", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="software-engineering"
        />
      );

      const customSetup = screen.getByRole("radio", {
        name: "Custom Setup: I'll enter my own job titles and skills",
      });
      expect(customSetup.className).toContain("border-surface-200");
    });
  });

  describe("grid layout", () => {
    it("renders profiles in a grid", () => {
      const { container } = render(<CareerProfileSelector {...defaultProps} />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toContain("grid-cols-2");
    });
  });

  describe("all profiles", () => {
    it("renders Product & Design profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Product & Design")).toBeInTheDocument();
      expect(
        screen.getByText("Product managers, designers, and UX researchers")
      ).toBeInTheDocument();
    });

    it("renders Marketing & SEO profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Marketing & SEO")).toBeInTheDocument();
    });

    it("renders Sales & Business profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Sales & Business")).toBeInTheDocument();
    });

    it("renders HR & People profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("HR & People")).toBeInTheDocument();
    });

    it("renders Finance & Accounting profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Finance & Accounting")).toBeInTheDocument();
    });

    it("renders Operations & PM profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Operations & PM")).toBeInTheDocument();
    });

    it("renders Content & Writing profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Content & Writing")).toBeInTheDocument();
    });

    it("renders Healthcare profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Healthcare")).toBeInTheDocument();
    });

    it("renders Legal profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Legal")).toBeInTheDocument();
    });

    it("renders Education profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Education")).toBeInTheDocument();
    });

    it("renders Customer Success profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Customer Success")).toBeInTheDocument();
    });

    it("renders Creative & Media profile", () => {
      render(<CareerProfileSelector {...defaultProps} />);

      expect(screen.getByText("Creative & Media")).toBeInTheDocument();
    });
  });

  describe("profile preview for different profiles", () => {
    it("shows Security profile preview", () => {
      render(
        <CareerProfileSelector {...defaultProps} selectedProfile="cybersecurity" />
      );

      expect(screen.getByText("Security Engineer")).toBeInTheDocument();
      expect(screen.getByText("Penetration Tester")).toBeInTheDocument();
    });

    it("shows Data & Analytics profile preview", () => {
      render(
        <CareerProfileSelector {...defaultProps} selectedProfile="data-science" />
      );

      expect(screen.getByText("Data Scientist")).toBeInTheDocument();
      expect(screen.getByText("ML Engineer")).toBeInTheDocument();
    });

    it("shows Product & Design profile preview", () => {
      render(
        <CareerProfileSelector
          {...defaultProps}
          selectedProfile="product-management"
        />
      );

      expect(screen.getByText("Product Manager")).toBeInTheDocument();
      expect(screen.getByText("Product Designer")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles invalid profile ID gracefully", () => {
      // Should not crash, just won't show preview
      render(
        <CareerProfileSelector {...defaultProps} selectedProfile="nonexistent" />
      );

      expect(screen.queryByText("You'll see jobs like:")).not.toBeInTheDocument();
    });

    it("callback is called with correct profile ID for each profile", () => {
      const onSelectProfile = vi.fn();
      render(
        <CareerProfileSelector {...defaultProps} onSelectProfile={onSelectProfile} />
      );

      // Click each profile and verify correct ID
      const profilesWithIds = [
        { name: "Software & Tech", id: "software-engineering" },
        { name: "Security", id: "cybersecurity" },
        { name: "Data & Analytics", id: "data-science" },
        { name: "Product & Design", id: "product-management" },
      ];

      for (const { name, id } of profilesWithIds) {
        fireEvent.click(screen.getByText(name));
        expect(onSelectProfile).toHaveBeenCalledWith(id);
        onSelectProfile.mockClear();
      }
    });
  });
});
