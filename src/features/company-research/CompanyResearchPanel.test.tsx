import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CompanyResearchPanel } from "./CompanyResearchPanel";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
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

  describe("rendering", () => {
    it("renders the company name and section label", () => {
      render(<CompanyResearchPanel companyName="Google" />);

      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("Company Research")).toBeInTheDocument();
    });

    it("shows the close button only when a close action is provided", () => {
      const { rerender } = render(
        <CompanyResearchPanel companyName="Example Services" />,
      );
      expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();

      rerender(
        <CompanyResearchPanel
          companyName="Example Services"
          onClose={() => undefined}
        />,
      );
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    it("calls the close action", () => {
      const onClose = vi.fn();
      render(
        <CompanyResearchPanel
          companyName="Example Services"
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByLabelText("Close"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("local company directory", () => {
    it.each([
      ["Kaiser", "Healthcare / Care Delivery", "Patient scheduling"],
      ["Target", "Retail", "Guest service"],
      ["City of Phoenix", "Government / Public Service", "Public service"],
      ["UPS", "Logistics", "Route planning"],
      ["State Farm", "Insurance", "Claims support"],
      ["Marriott", "Hospitality", "Reservations"],
      ["Google", "Technology", "Program coordination"],
    ])("shows broad local guidance for %s", (company, industry, workArea) => {
      render(<CompanyResearchPanel companyName={company} />);

      expect(screen.getByText(industry)).toBeInTheDocument();
      expect(screen.getByText(workArea)).toBeInTheDocument();
    });

    it("matches partial company names without case sensitivity", () => {
      render(<CompanyResearchPanel companyName="KAISER PERMANENTE" />);

      expect(
        screen.getByText("Healthcare / Care Delivery"),
      ).toBeInTheDocument();
    });

    it("shows stable directory details", () => {
      render(<CompanyResearchPanel companyName="Google" />);

      expect(screen.getByText("Founded")).toBeInTheDocument();
      expect(screen.getByText("1998")).toBeInTheDocument();
      expect(screen.getByText("Headquarters")).toBeInTheDocument();
      expect(screen.getByText("Mountain View, CA")).toBeInTheDocument();
      expect(screen.getByText("Employees")).toBeInTheDocument();
    });

    it("links to the company website without opener access", () => {
      render(<CompanyResearchPanel companyName="Marriott" />);

      expect(screen.getByRole("link", { name: /visit website/i })).toHaveAttribute(
        "href",
        "https://www.marriott.com",
      );
      expect(screen.getByRole("link", { name: /visit website/i })).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    });
  });

  describe("unknown companies", () => {
    it("shows local limits and research guidance", () => {
      render(<CompanyResearchPanel companyName="MyNewCompany" />);

      expect(
        screen.getByText("Limited information available for this company."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Try the official careers page and public job or review pages for "MyNewCompany"/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /JobSentinel does not have local company details for MyNewCompany yet/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("privacy cleanup", () => {
    it("removes the old persistent company cache without reading or writing it", () => {
      localStorageMock.setItem(
        "jobsentinel_company_cache",
        JSON.stringify({ privateCompany: "Example" }),
      );
      vi.clearAllMocks();

      render(<CompanyResearchPanel companyName="Kaiser" />);

      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "jobsentinel_company_cache",
      );
    });
  });
});
