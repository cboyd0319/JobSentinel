import { beforeEach, describe, expect, it } from "vitest";
import {
  JobType,
  RemoteType,
  SiteCategory,
} from "../../../shared/search-links";
import type {
  DeepLink,
  SearchCriteria,
  SiteInfo,
} from "../../../shared/search-links";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { handleMockSearchLinksCommand } from "./commands";

const deepLinkCriteria: SearchCriteria = {
  query: "Care Coordinator",
  location: "Denver, CO",
  job_type: JobType.FullTime,
  remote_type: RemoteType.Remote,
};

describe("Search Links mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("generates safe links with the backend command names", async () => {
    const sites = await mockInvoke<SiteInfo[]>("get_supported_sites");

    expect(sites.length).toBeGreaterThanOrEqual(15);
    expect(sites).toContainEqual(
      expect.objectContaining({
        id: "linkedin",
        name: "LinkedIn",
        category: SiteCategory.Professional,
        requires_login: true,
      }),
    );

    const techSites = await mockInvoke<SiteInfo[]>("get_sites_by_category_cmd", {
      category: SiteCategory.Tech,
    });
    expect(techSites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dice", category: SiteCategory.Tech }),
      ]),
    );
    expect(techSites).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "stackoverflow" })]),
    );
    expect(techSites.every((site) => site.category === SiteCategory.Tech)).toBe(true);

    const links = await mockInvoke<DeepLink[]>("generate_deep_links", {
      criteria: deepLinkCriteria,
    });
    expect(links.length).toBe(sites.length);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          site: expect.objectContaining({ id: "indeed" }),
          url: expect.stringContaining(
            "https://www.indeed.com/jobs?q=Care%20Coordinator",
          ),
        }),
      ]),
    );

    const linkedin = await mockInvoke<DeepLink>("generate_deep_link", {
      siteId: "linkedin",
      criteria: deepLinkCriteria,
    });
    expect(linkedin).toMatchObject({
      site: expect.objectContaining({ id: "linkedin", name: "LinkedIn" }),
    });
    expect(linkedin.url).toContain("keywords=Care%20Coordinator");
    expect(linkedin.url).toContain("location=Denver%2C%20CO");
    expect(linkedin.url).toContain("f_JT=F");
    expect(linkedin.url).toContain("f_WT=2");

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "https://www.linkedin.com/jobs/search/?keywords=Care%20Coordinator",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects unsafe external links", async () => {
    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "http://localhost:3000/jobs?query=Care%20Coordinator",
      }),
    ).rejects.toThrow("This job-site link is not safe to open");
    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "http://www.linkedin.com/jobs/search/?keywords=Care%20Coordinator",
      }),
    ).rejects.toThrow("This job-site link is not safe to open");
  });

  it("rejects commands owned by another feature", () => {
    expect(handleMockSearchLinksCommand("preview_job_import", undefined)).toEqual({
      handled: false,
      value: undefined,
    });
  });
});
