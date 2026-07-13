import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchLinksPage from ".";
import * as searchLinks from "../../shared/search-links";
import { JobType, RemoteType, SiteCategory } from "../../shared/search-links";

vi.mock("../../shared/search-links/client", () => ({
  generateDeepLinks: vi.fn(),
  openDeepLink: vi.fn(),
}));

describe("SearchLinksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchLinks.generateDeepLinks).mockResolvedValue([
      {
        site: {
          id: "linkedin",
          name: "LinkedIn",
          category: SiteCategory.Professional,
          requires_login: true,
          requires_user_acknowledgement: true,
        },
        url: "https://www.linkedin.com/jobs/search/?keywords=marketing",
      },
    ]);
  });

  it("uses broad-audience search examples", () => {
    render(<SearchLinksPage />);

    const queryInput = screen.getByLabelText(/job title or work words/i);

    expect(queryInput).toHaveAttribute(
      "placeholder",
      "e.g., Marketing Manager, Registered Nurse",
    );
  });

  it("uses plain search-link copy instead of URL jargon", async () => {
    const user = userEvent.setup();
    render(<SearchLinksPage />);

    expect(
      screen.getByRole("heading", { name: /job site search links/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create search links/i })).toBeInTheDocument();
    expect(screen.queryByText(/search URLs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deep links/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scan automatically/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/does not monitor directly/i)).not.toBeInTheDocument();
    expect(screen.getByText(/review in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/scheduled source checks/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/job title or work words/i), "Marketing Manager");
    await user.click(screen.getByRole("button", { name: /create search links/i }));

    expect(
      await screen.findByRole("button", {
        name: /open linkedin search in your browser/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Opens in your browser")).toBeInTheDocument();
    expect(screen.queryByText(/linkedin\.com\/jobs\/search/i)).not.toBeInTheDocument();
  });

  it("gives each generated search action a unique accessible name", async () => {
    const user = userEvent.setup();
    vi.mocked(searchLinks.generateDeepLinks).mockResolvedValueOnce([
      {
        site: {
          id: "linkedin",
          name: "LinkedIn",
          category: SiteCategory.Professional,
          requires_login: true,
          requires_user_acknowledgement: true,
        },
        url: "https://www.linkedin.com/jobs/search/?keywords=marketing",
      },
      {
        site: {
          id: "company",
          name: "Company Careers",
          category: SiteCategory.General,
          requires_login: false,
        },
        url: "https://example.com/careers?query=marketing",
      },
    ]);

    render(<SearchLinksPage />);

    await user.type(screen.getByLabelText(/job title or work words/i), "Marketing Manager");
    await user.click(screen.getByRole("button", { name: /create search links/i }));

    expect(
      await screen.findByRole("button", {
        name: /open linkedin search in your browser/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /open company careers search in your browser/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^open search$/i })).toHaveLength(0);
  });

  it("does not load remote site logos when showing search links", async () => {
    const user = userEvent.setup();
    vi.mocked(searchLinks.generateDeepLinks).mockResolvedValueOnce([
      {
        site: {
          id: "linkedin",
          name: "LinkedIn",
          category: SiteCategory.Professional,
          requires_login: true,
          requires_user_acknowledgement: true,
          logo_url: "https://www.linkedin.com/favicon.ico",
        },
        url: "https://www.linkedin.com/jobs/search/?keywords=marketing",
      },
    ]);

    render(<SearchLinksPage />);

    await user.type(screen.getByLabelText(/job title or work words/i), "Marketing Manager");
    await user.click(screen.getByRole("button", { name: /create search links/i }));

    expect(await screen.findByText("LinkedIn")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /linkedin logo/i })).not.toBeInTheDocument();
  });

  it("guides users when the search words are missing", async () => {
    const user = userEvent.setup();
    render(<SearchLinksPage />);

    await user.click(screen.getByRole("button", { name: /create search links/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Add a job title or work words.");
    expect(searchLinks.generateDeepLinks).not.toHaveBeenCalled();
  });

  it("requires acknowledgement before opening a restricted-source search link", async () => {
    const user = userEvent.setup();
    render(<SearchLinksPage />);

    await user.type(screen.getByLabelText(/job title or work words/i), "Marketing Manager");
    await user.click(screen.getByRole("button", { name: /create search links/i }));

    expect(await screen.findByText(/rules about automated tools/i)).toBeInTheDocument();
    const openButton = screen.getByRole("button", {
      name: /open linkedin search in your browser/i,
    });
    expect(openButton).toBeDisabled();
    expect(searchLinks.openDeepLink).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/I understand this risk and want to open this search/i));
    expect(openButton).toBeEnabled();

    await user.click(openButton);

    await waitFor(() => {
      expect(searchLinks.openDeepLink).toHaveBeenCalledWith(
        "https://www.linkedin.com/jobs/search/?keywords=marketing",
      );
    });
  });

  it("sends selected job type and work mode filters when generating links", async () => {
    const user = userEvent.setup();
    render(<SearchLinksPage />);

    await user.type(screen.getByLabelText(/job title or work words/i), "Marketing Manager");
    await user.type(screen.getByLabelText(/location/i), "Remote");
    await user.selectOptions(screen.getByLabelText(/job type/i), JobType.Contract);
    await user.selectOptions(screen.getByLabelText(/work mode/i), RemoteType.Remote);
    await user.click(screen.getByRole("button", { name: /create search links/i }));

    await waitFor(() => {
      expect(searchLinks.generateDeepLinks).toHaveBeenCalledWith({
        query: "Marketing Manager",
        location: "Remote",
        job_type: JobType.Contract,
        remote_type: RemoteType.Remote,
      });
    });
  });
});
