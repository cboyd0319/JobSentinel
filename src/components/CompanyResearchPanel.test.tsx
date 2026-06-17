import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompanyResearchPanel } from "./CompanyResearchPanel";
import {
  clearCompanyResearchMemoryCacheForTests,
  seedCompanyResearchMemoryCacheForTests,
} from "./companyResearchCache";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("CompanyResearchPanel", () => {
  beforeEach(() => {
    clearCompanyResearchMemoryCacheForTests();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders company name in header", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
      });
    });

    it("shows Company Research label", async () => {
      render(<CompanyResearchPanel companyName="Example Services" />);
      expect(screen.getByText("Company Research")).toBeInTheDocument();
    });

    it("shows close button when onClose is provided", () => {
      const onClose = vi.fn();
      render(<CompanyResearchPanel companyName="Example Services" onClose={onClose} />);
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    it("does not show close button when onClose is not provided", () => {
      render(<CompanyResearchPanel companyName="Example Services" />);
      expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(<CompanyResearchPanel companyName="Example Services" onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("known companies", () => {
    it("displays healthcare company info", async () => {
      render(<CompanyResearchPanel companyName="Kaiser" />);

      await waitFor(() => {
        expect(screen.getByText("Healthcare / Care Delivery")).toBeInTheDocument();
      });
      expect(screen.getByText("Large employer")).toBeInTheDocument();
    });

    it("displays retail company info", async () => {
      render(<CompanyResearchPanel companyName="Target" />);

      await waitFor(() => {
        expect(screen.getByText("Retail")).toBeInTheDocument();
      });
      expect(screen.getByText("Varies by role")).toBeInTheDocument();
    });

    it("displays public-service company info", async () => {
      render(<CompanyResearchPanel companyName="City of Phoenix" />);

      await waitFor(() => {
        expect(screen.getByText("Government / Public Service")).toBeInTheDocument();
      });
      expect(screen.getByText("Varies by department")).toBeInTheDocument();
    });

    it("displays tools and systems for known company", async () => {
      render(<CompanyResearchPanel companyName="Kaiser" />);

      await waitFor(() => {
        expect(screen.getByText("Tools and systems")).toBeInTheDocument();
      });
      expect(screen.getByText("Patient scheduling")).toBeInTheDocument();
      expect(screen.getByText("Care coordination")).toBeInTheDocument();
    });

    it("displays remote policy badge", async () => {
      render(<CompanyResearchPanel companyName="UPS" />);

      await waitFor(() => {
        expect(screen.getByText("Varies by role")).toBeInTheDocument();
      });
    });

    it("displays Glassdoor rating with stars", async () => {
      seedCompanyResearchMemoryCacheForTests("RatedCompany", {
        name: "RatedCompany",
        industry: "Testing",
        glassdoorRating: 4.4,
      });

      render(<CompanyResearchPanel companyName="RatedCompany" />);

      await waitFor(() => {
        expect(screen.getByText("Glassdoor Rating")).toBeInTheDocument();
      });
      expect(screen.getByText("4.4")).toBeInTheDocument();
    });

    it("displays employee count", async () => {
      render(<CompanyResearchPanel companyName="Walmart" />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });
      expect(screen.getByText("Large employer")).toBeInTheDocument();
    });

    it("displays website link", async () => {
      render(<CompanyResearchPanel companyName="Marriott" />);

      await waitFor(() => {
        expect(screen.getByText("Visit Website")).toBeInTheDocument();
      });

      const link = screen.getByRole("link", { name: /visit website/i });
      expect(link).toHaveAttribute("href", "https://www.marriott.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("unknown companies", () => {
    it("shows limited info message for unknown company", async () => {
      render(<CompanyResearchPanel companyName="UnknownStartup123" />);

      await waitFor(() => {
        expect(screen.getByText("Limited information available for this company.")).toBeInTheDocument();
      });
    });

    it("suggests official and public-source research for unknown company", async () => {
      render(<CompanyResearchPanel companyName="MyNewCompany" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Try the official careers page and public job or review pages for "MyNewCompany"/),
        ).toBeInTheDocument();
      });
    });

    it("shows description for unknown company", async () => {
      render(<CompanyResearchPanel companyName="SomeCompany" />);

      await waitFor(() => {
        expect(
          screen.getByText(/JobSentinel does not have local company details for SomeCompany yet/),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/being gathered|check back later/i)).not.toBeInTheDocument();
    });
  });

  describe("caching", () => {
    it("keeps company info out of localStorage and clears the legacy cache key", async () => {
      render(<CompanyResearchPanel companyName="Kaiser" />);

      await waitFor(() => {
        expect(screen.getByText("Healthcare / Care Delivery")).toBeInTheDocument();
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        "jobsentinel_company_cache",
        expect.any(String),
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("jobsentinel_company_cache");
    });

    it("uses in-memory cached data on subsequent renders", async () => {
      seedCompanyResearchMemoryCacheForTests("TestCached", {
        name: "TestCached",
        industry: "Testing",
        founded: "2024",
        headquarters: "Test City",
      });

      render(<CompanyResearchPanel companyName="TestCached" />);

      await waitFor(() => {
        expect(screen.getByText("Testing")).toBeInTheDocument();
      });
      expect(screen.getByText("Test City")).toBeInTheDocument();
    });

    it("ignores legacy localStorage cache entries", async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        badco: {
          data: {
            name: "BadCo",
            industry: "Bad Industry",
          },
          timestamp: Date.now(),
        },
      }));

      render(<CompanyResearchPanel companyName="BadCo" />);

      await waitFor(() => {
        expect(screen.getByText(/Limited information available/)).toBeInTheDocument();
      });
      expect(screen.queryByText("Bad Industry")).not.toBeInTheDocument();
    });

    it("renders legacy cached tool values as tools and systems", async () => {
      seedCompanyResearchMemoryCacheForTests("LegacyCo", {
        name: "LegacyCo",
        industry: "Saved cache",
        techStack: ["Scheduling", "Customer support"],
      });

      render(<CompanyResearchPanel companyName="LegacyCo" />);

      await waitFor(() => {
        expect(screen.getByText("Tools and systems")).toBeInTheDocument();
      });
      expect(screen.getByText("Scheduling")).toBeInTheDocument();
      expect(screen.getByText("Customer support")).toBeInTheDocument();
    });

    it("ignores expired cache entries", async () => {
      seedCompanyResearchMemoryCacheForTests(
        "UnknownExpired",
        {
          name: "UnknownExpired",
          industry: "Old Industry",
        },
        Date.now() - 25 * 60 * 60 * 1000,
      );

      render(<CompanyResearchPanel companyName="UnknownExpired" />);

      // Should show limited info for unknown company (expired cache ignored)
      await waitFor(() => {
        expect(screen.getByText(/Limited information available/)).toBeInTheDocument();
      });
    });
  });

  describe("partial company name matching", () => {
    it("matches company by partial name (includes)", async () => {
      render(<CompanyResearchPanel companyName="Kaiser Permanente" />);

      await waitFor(() => {
        expect(screen.getByText("Healthcare / Care Delivery")).toBeInTheDocument();
      });
    });

    it("handles case-insensitive matching", async () => {
      render(<CompanyResearchPanel companyName="WALMART" />);

      await waitFor(() => {
        expect(screen.getByText("Retail / Operations")).toBeInTheDocument();
      });
    });
  });

  describe("company details", () => {
    it("displays founded year from saved company data", async () => {
      seedCompanyResearchMemoryCacheForTests("LocalClinic", {
        name: "LocalClinic",
        industry: "Healthcare",
        founded: "1985",
      });

      render(<CompanyResearchPanel companyName="LocalClinic" />);

      await waitFor(() => {
        expect(screen.getByText("Founded")).toBeInTheDocument();
      });
      expect(screen.getByText("1985")).toBeInTheDocument();
    });

    it("displays headquarters from saved company data", async () => {
      seedCompanyResearchMemoryCacheForTests("RegionalSchool", {
        name: "RegionalSchool",
        industry: "Education",
        headquarters: "Denver, CO",
      });

      render(<CompanyResearchPanel companyName="RegionalSchool" />);

      await waitFor(() => {
        expect(screen.getByText("Headquarters")).toBeInTheDocument();
      });
      expect(screen.getByText("Denver, CO")).toBeInTheDocument();
    });

    it("displays all tools and systems", async () => {
      render(<CompanyResearchPanel companyName="Walmart" />);

      await waitFor(() => {
        expect(screen.getByText("Store operations")).toBeInTheDocument();
      });
      expect(screen.getByText("Inventory")).toBeInTheDocument();
      expect(screen.getByText("Customer service")).toBeInTheDocument();
    });
  });

  describe("rating display", () => {
    it("renders rating number correctly", async () => {
      seedCompanyResearchMemoryCacheForTests("SteadyWork", {
        name: "SteadyWork",
        industry: "Operations",
        glassdoorRating: 4.5,
      });

      render(<CompanyResearchPanel companyName="SteadyWork" />);

      await waitFor(() => {
        expect(screen.getByText("4.5")).toBeInTheDocument();
      });
    });

    it("renders high rating correctly", async () => {
      seedCompanyResearchMemoryCacheForTests("CommunityCare", {
        name: "CommunityCare",
        industry: "Healthcare",
        glassdoorRating: 4.8,
      });

      render(<CompanyResearchPanel companyName="CommunityCare" />);

      await waitFor(() => {
        expect(screen.getByText("4.8")).toBeInTheDocument();
      });
    });
  });

  describe("info row display", () => {
    it("displays label and value correctly", async () => {
      seedCompanyResearchMemoryCacheForTests("NeighborhoodBank", {
        name: "NeighborhoodBank",
        industry: "Banking",
        founded: "1972",
        employeeCount: "250+",
      });

      render(<CompanyResearchPanel companyName="NeighborhoodBank" />);

      await waitFor(() => {
        expect(screen.getByText("Founded")).toBeInTheDocument();
      });
      expect(screen.getByText("1972")).toBeInTheDocument();
      expect(screen.getByText("Employees")).toBeInTheDocument();
      expect(screen.getByText("250+")).toBeInTheDocument();
    });
  });

  describe("various company types", () => {
    it("displays healthcare and retail company (CVS)", async () => {
      render(<CompanyResearchPanel companyName="CVS" />);

      await waitFor(() => {
        expect(screen.getByText("Healthcare / Retail")).toBeInTheDocument();
      });
      expect(screen.getByText("Pharmacy systems")).toBeInTheDocument();
    });

    it("displays food-service company (Starbucks)", async () => {
      render(<CompanyResearchPanel companyName="Starbucks" />);

      await waitFor(() => {
        expect(screen.getByText("Food Service / Retail")).toBeInTheDocument();
      });
    });

    it("displays logistics company (UPS)", async () => {
      render(<CompanyResearchPanel companyName="UPS" />);

      await waitFor(() => {
        expect(screen.getByText("Logistics")).toBeInTheDocument();
      });
      expect(screen.getByText("Route planning")).toBeInTheDocument();
    });

    it("displays insurance company (State Farm)", async () => {
      render(<CompanyResearchPanel companyName="State Farm" />);

      await waitFor(() => {
        expect(screen.getByText("Insurance")).toBeInTheDocument();
      });
    });

    it("displays banking company (Bank of America)", async () => {
      render(<CompanyResearchPanel companyName="Bank of America" />);

      await waitFor(() => {
        expect(screen.getByText("Banking / Financial Services")).toBeInTheDocument();
      });
      expect(screen.getByText("Risk controls")).toBeInTheDocument();
    });

    it("displays trades-adjacent retail company (Home Depot)", async () => {
      render(<CompanyResearchPanel companyName="Home Depot" />);

      await waitFor(() => {
        expect(screen.getByText("Retail / Trades")).toBeInTheDocument();
      });
    });

    it("displays hospitality company (Marriott)", async () => {
      render(<CompanyResearchPanel companyName="Marriott" />);

      await waitFor(() => {
        expect(screen.getByText("Hospitality")).toBeInTheDocument();
      });
    });

    it("still supports technology companies without making them the default fixture", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
      });
    });

    it("does not ship hardcoded employer ratings in the local fallback", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
      });
      expect(screen.queryByText("Glassdoor Rating")).not.toBeInTheDocument();
    });
  });
});
