import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompanyResearchPanel } from "./CompanyResearchPanel";

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
      render(<CompanyResearchPanel companyName="TestCorp" />);
      expect(screen.getByText("Company Research")).toBeInTheDocument();
    });

    it("shows close button when onClose is provided", () => {
      const onClose = vi.fn();
      render(<CompanyResearchPanel companyName="TestCorp" onClose={onClose} />);
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    it("does not show close button when onClose is not provided", () => {
      render(<CompanyResearchPanel companyName="TestCorp" />);
      expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(<CompanyResearchPanel companyName="TestCorp" onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("known companies", () => {
    it("displays Google company info", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
      });
      expect(screen.getByText("Mountain View, CA")).toBeInTheDocument();
      expect(screen.getByText("1998")).toBeInTheDocument();
    });

    it("displays Meta company info", async () => {
      render(<CompanyResearchPanel companyName="Meta" />);

      await waitFor(() => {
        expect(screen.getByText("Technology / Social Media")).toBeInTheDocument();
      });
      expect(screen.getByText("Menlo Park, CA")).toBeInTheDocument();
    });

    it("displays Anthropic company info", async () => {
      render(<CompanyResearchPanel companyName="Anthropic" />);

      await waitFor(() => {
        expect(screen.getByText("AI / Research")).toBeInTheDocument();
      });
      expect(screen.getByText("Series D")).toBeInTheDocument();
    });

    it("displays Stripe company info with funding stage", async () => {
      render(<CompanyResearchPanel companyName="Stripe" />);

      await waitFor(() => {
        expect(screen.getByText("Fintech")).toBeInTheDocument();
      });
      expect(screen.getByText("Late Stage")).toBeInTheDocument();
    });

    it("displays tech stack for known company", async () => {
      render(<CompanyResearchPanel companyName="Discord" />);

      await waitFor(() => {
        expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      });
      expect(screen.getByText("Rust")).toBeInTheDocument();
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    it("displays remote policy badge", async () => {
      render(<CompanyResearchPanel companyName="Vercel" />);

      await waitFor(() => {
        expect(screen.getByText("Remote-first")).toBeInTheDocument();
      });
    });

    it("displays Glassdoor rating with stars", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      await waitFor(() => {
        expect(screen.getByText("Glassdoor Rating")).toBeInTheDocument();
      });
      expect(screen.getByText("4.4")).toBeInTheDocument();
    });

    it("displays employee count", async () => {
      render(<CompanyResearchPanel companyName="Microsoft" />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });
      expect(screen.getByText("220,000+")).toBeInTheDocument();
    });

    it("displays website link", async () => {
      render(<CompanyResearchPanel companyName="Netflix" />);

      await waitFor(() => {
        expect(screen.getByText("Visit Website")).toBeInTheDocument();
      });

      const link = screen.getByRole("link", { name: /visit website/i });
      expect(link).toHaveAttribute("href", "https://netflix.com");
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

    it("suggests LinkedIn/Glassdoor search for unknown company", async () => {
      render(<CompanyResearchPanel companyName="MyNewCompany" />);

      await waitFor(() => {
        expect(screen.getByText(/Try searching for "MyNewCompany" on LinkedIn or Glassdoor/)).toBeInTheDocument();
      });
    });

    it("shows description for unknown company", async () => {
      render(<CompanyResearchPanel companyName="SomeCompany" />);

      await waitFor(() => {
        expect(screen.getByText(/Information about SomeCompany is being gathered/)).toBeInTheDocument();
      });
    });
  });

  describe("caching", () => {
    it("caches company info in localStorage", async () => {
      render(<CompanyResearchPanel companyName="Google" />);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
      });

      // Verify cache was written
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Verify cache key
      const cacheCall = localStorageMock.setItem.mock.calls.find(
        (call: [string, string]) => call[0] === "jobsentinel_company_cache"
      );
      expect(cacheCall).toBeDefined();
    });

    it("uses cached data on subsequent renders", async () => {
      // Pre-populate cache
      const cache = {
        "testcached": {
          data: {
            name: "TestCached",
            industry: "Testing",
            founded: "2024",
            headquarters: "Test City",
          },
          timestamp: Date.now(),
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cache));

      render(<CompanyResearchPanel companyName="TestCached" />);

      await waitFor(() => {
        expect(screen.getByText("Testing")).toBeInTheDocument();
      });
      expect(screen.getByText("Test City")).toBeInTheDocument();
    });

    it("ignores expired cache entries", async () => {
      // Pre-populate cache with expired entry (older than COMPANY_CACHE_TTL)
      const cache = {
        "unknownexpired": {
          data: {
            name: "UnknownExpired",
            industry: "Old Industry",
          },
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cache));

      render(<CompanyResearchPanel companyName="UnknownExpired" />);

      // Should show limited info for unknown company (expired cache ignored)
      await waitFor(() => {
        expect(screen.getByText(/Limited information available/)).toBeInTheDocument();
      });
    });
  });

  describe("partial company name matching", () => {
    it("matches company by partial name (includes)", async () => {
      render(<CompanyResearchPanel companyName="Google Inc" />);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
      });
    });

    it("handles case-insensitive matching", async () => {
      render(<CompanyResearchPanel companyName="OPENAI" />);

      await waitFor(() => {
        expect(screen.getByText("AI / Research")).toBeInTheDocument();
      });
    });
  });

  describe("company details", () => {
    it("displays founded year", async () => {
      render(<CompanyResearchPanel companyName="Apple" />);

      await waitFor(() => {
        expect(screen.getByText("Founded")).toBeInTheDocument();
      });
      expect(screen.getByText("1976")).toBeInTheDocument();
    });

    it("displays headquarters", async () => {
      render(<CompanyResearchPanel companyName="Amazon" />);

      await waitFor(() => {
        expect(screen.getByText("Headquarters")).toBeInTheDocument();
      });
      expect(screen.getByText("Seattle, WA")).toBeInTheDocument();
    });

    it("displays all tech stack items", async () => {
      render(<CompanyResearchPanel companyName="Supabase" />);

      await waitFor(() => {
        expect(screen.getByText("TypeScript")).toBeInTheDocument();
      });
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
      expect(screen.getByText("Go")).toBeInTheDocument();
    });
  });

  describe("rating display", () => {
    it("renders rating number correctly", async () => {
      render(<CompanyResearchPanel companyName="DeepMind" />);

      await waitFor(() => {
        expect(screen.getByText("4.5")).toBeInTheDocument();
      });
    });

    it("renders high rating correctly", async () => {
      render(<CompanyResearchPanel companyName="Linear" />);

      await waitFor(() => {
        expect(screen.getByText("4.8")).toBeInTheDocument();
      });
    });
  });

  describe("info row display", () => {
    it("displays label and value correctly", async () => {
      render(<CompanyResearchPanel companyName="Uber" />);

      await waitFor(() => {
        expect(screen.getByText("Founded")).toBeInTheDocument();
      });
      expect(screen.getByText("2009")).toBeInTheDocument();
      expect(screen.getByText("Employees")).toBeInTheDocument();
      expect(screen.getByText("32,000+")).toBeInTheDocument();
    });
  });

  describe("various company types", () => {
    it("displays fintech company (Coinbase)", async () => {
      render(<CompanyResearchPanel companyName="Coinbase" />);

      await waitFor(() => {
        expect(screen.getByText("Crypto / Fintech")).toBeInTheDocument();
      });
      expect(screen.getByText("Remote-first")).toBeInTheDocument();
    });

    it("displays gaming company (Roblox)", async () => {
      render(<CompanyResearchPanel companyName="Roblox" />);

      await waitFor(() => {
        expect(screen.getByText("Gaming / Metaverse")).toBeInTheDocument();
      });
    });

    it("displays security company (CrowdStrike)", async () => {
      render(<CompanyResearchPanel companyName="CrowdStrike" />);

      await waitFor(() => {
        expect(screen.getByText("Cybersecurity")).toBeInTheDocument();
      });
    });

    it("displays communication company (Slack)", async () => {
      render(<CompanyResearchPanel companyName="Slack" />);

      await waitFor(() => {
        expect(screen.getByText("Enterprise / Communication")).toBeInTheDocument();
      });
    });

    it("displays AI startup (Cursor)", async () => {
      render(<CompanyResearchPanel companyName="Cursor" />);

      await waitFor(() => {
        expect(screen.getByText("AI / Developer Tools")).toBeInTheDocument();
      });
      expect(screen.getByText("Series A")).toBeInTheDocument();
    });

    it("displays cloud database company (PlanetScale)", async () => {
      render(<CompanyResearchPanel companyName="PlanetScale" />);

      await waitFor(() => {
        expect(screen.getByText("Cloud / Database")).toBeInTheDocument();
      });
    });

    it("displays travel company (Airbnb)", async () => {
      render(<CompanyResearchPanel companyName="Airbnb" />);

      await waitFor(() => {
        expect(screen.getByText("Travel / Hospitality")).toBeInTheDocument();
      });
    });

    it("displays productivity company (Notion)", async () => {
      render(<CompanyResearchPanel companyName="Notion" />);

      await waitFor(() => {
        expect(screen.getByText("Productivity / Collaboration")).toBeInTheDocument();
      });
    });
  });
});
