import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeepLinkGenerator } from "./DeepLinkGenerator";
import * as deeplinks from "../services/deeplinks";
import { JobType, RemoteType, SiteCategory } from "../types/deeplinks";

vi.mock("../services/deeplinks", () => ({
  generateDeepLinks: vi.fn(),
  getSupportedSites: vi.fn(),
  openDeepLink: vi.fn(),
}));

describe("DeepLinkGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deeplinks.getSupportedSites).mockResolvedValue([]);
    vi.mocked(deeplinks.generateDeepLinks).mockResolvedValue([
      {
        site: {
          id: "linkedin",
          name: "LinkedIn",
          category: SiteCategory.Professional,
          requires_login: true,
        },
        url: "https://www.linkedin.com/jobs/search/?keywords=rust",
      },
    ]);
  });

  it("sends selected job type and work mode filters when generating links", async () => {
    const user = userEvent.setup();
    render(<DeepLinkGenerator />);

    await user.type(screen.getByLabelText(/job title or keywords/i), "Rust Engineer");
    await user.type(screen.getByLabelText(/location/i), "Remote");
    await user.selectOptions(screen.getByLabelText(/job type/i), JobType.Contract);
    await user.selectOptions(screen.getByLabelText(/work mode/i), RemoteType.Remote);
    await user.click(screen.getByRole("button", { name: /generate deep links/i }));

    await waitFor(() => {
      expect(deeplinks.generateDeepLinks).toHaveBeenCalledWith({
        query: "Rust Engineer",
        location: "Remote",
        job_type: JobType.Contract,
        remote_type: RemoteType.Remote,
      });
    });
  });
});
