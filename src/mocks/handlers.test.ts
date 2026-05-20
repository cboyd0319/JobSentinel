import { beforeEach, describe, expect, it } from "vitest";
import { JobType, RemoteType, SiteCategory } from "../types/deeplinks";
import type { DeepLink, SearchCriteria, SiteInfo } from "../types/deeplinks";
import type { PostedDateFilter, ScoreFilter, SortOption } from "../pages/DashboardTypes";
import type { NotificationPreferences } from "../utils/notificationPreferences";
import { mockInvoke, resetMockData } from "./handlers";

type BackendSavedSearch = {
  id: string;
  name: string;
  sortBy: SortOption;
  scoreFilter: ScoreFilter;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: PostedDateFilter | null;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
  ghostFilter: string | null;
  textSearch: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type CoverLetterTemplate = {
  id: string;
  name: string;
  content: string;
  category: "general" | "tech" | "creative" | "finance" | "healthcare" | "sales" | "custom" | "thankyou" | "followup" | "withdrawal";
  createdAt: string;
  updatedAt: string;
};

type JobImportPreview = {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
};

type ImportedJob = {
  id: number;
  hash: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  source: string;
  remote: boolean;
  score: number;
};

const savedSearchInput: BackendSavedSearch = {
  id: "",
  name: "Remote Rust",
  sortBy: "score-desc",
  scoreFilter: "all",
  sourceFilter: "all",
  remoteFilter: "remote",
  bookmarkFilter: "all",
  notesFilter: "all",
  postedDateFilter: "7d",
  salaryMinFilter: 120000,
  salaryMaxFilter: 180000,
  ghostFilter: null,
  textSearch: "rust",
  createdAt: "",
  lastUsedAt: null,
};

const notificationPreferencesInput: NotificationPreferences = {
  linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
  indeed: { enabled: false, minScoreThreshold: 85, soundEnabled: false },
  greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
  jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
  global: {
    enabled: true,
    quietHoursStart: "21:00",
    quietHoursEnd: "07:00",
    quietHoursEnabled: true,
  },
  advancedFilters: {
    includeKeywords: ["Staff"],
    excludeKeywords: ["Contract"],
    minSalary: 150,
    remoteOnly: true,
    companyWhitelist: ["Anthropic"],
    companyBlacklist: ["AvoidCo"],
  },
};

const deepLinkCriteria: SearchCriteria = {
  query: "Rust Developer",
  location: "Denver, CO",
  job_type: JobType.FullTime,
  remote_type: RemoteType.Remote,
};

describe("mock Tauri handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("stores saved searches with the real backend command names", async () => {
    const created = await mockInvoke<BackendSavedSearch>("create_saved_search", {
      search: savedSearchInput,
    });

    expect(created).toMatchObject({
      id: "mock-saved-search-1",
      name: "Remote Rust",
      sortBy: "score-desc",
      scoreFilter: "all",
      sourceFilter: "all",
      remoteFilter: "remote",
      bookmarkFilter: "all",
      notesFilter: "all",
      postedDateFilter: "7d",
      salaryMinFilter: 120000,
      salaryMaxFilter: 180000,
      ghostFilter: null,
      textSearch: "rust",
      lastUsedAt: null,
    });
    expect(created.createdAt).toEqual(expect.any(String));

    expect(await mockInvoke<BackendSavedSearch[]>("list_saved_searches", {})).toEqual([
      created,
    ]);

    expect(await mockInvoke<boolean>("use_saved_search", { id: created.id })).toBe(true);
    const [used] = await mockInvoke<BackendSavedSearch[]>("list_saved_searches", {});
    expect(used.lastUsedAt).toEqual(expect.any(String));

    expect(await mockInvoke<boolean>("delete_saved_search", { id: created.id })).toBe(true);
    expect(await mockInvoke<BackendSavedSearch[]>("list_saved_searches", {})).toEqual([]);
  });

  it("stores bounded deduplicated search history", async () => {
    await mockInvoke<void>("add_search_history", { query: "rust remote" });
    await mockInvoke<void>("add_search_history", { query: "typescript remote" });
    await mockInvoke<void>("add_search_history", { query: "rust remote" });

    expect(await mockInvoke<string[]>("get_search_history", { limit: 20 })).toEqual([
      "rust remote",
      "typescript remote",
    ]);
    expect(await mockInvoke<string[]>("get_search_history", { limit: 1 })).toEqual([
      "rust remote",
    ]);

    await mockInvoke<void>("clear_search_history");

    expect(await mockInvoke<string[]>("get_search_history", { limit: 20 })).toEqual([]);
  });

  it("stores cover letter templates with the real backend command names", async () => {
    expect(await mockInvoke<number>("seed_default_templates")).toBe(6);
    const seededTemplates = await mockInvoke<CoverLetterTemplate[]>(
      "list_cover_letter_templates",
    );
    expect(seededTemplates).toHaveLength(6);

    const created = await mockInvoke<CoverLetterTemplate>("create_cover_letter_template", {
      name: "Targeted letter",
      content: "Dear {company}, I can help.",
      category: "custom",
    });

    expect(created).toMatchObject({
      id: "mock-cover-letter-template-7",
      name: "Targeted letter",
      content: "Dear {company}, I can help.",
      category: "custom",
    });
    expect(created.createdAt).toEqual(expect.any(String));
    expect(created.updatedAt).toEqual(created.createdAt);

    expect(
      await mockInvoke<CoverLetterTemplate | null>("get_cover_letter_template", {
        id: created.id,
      }),
    ).toEqual(created);

    const updated = await mockInvoke<CoverLetterTemplate | null>(
      "update_cover_letter_template",
      {
        id: created.id,
        name: "Updated letter",
        content: "Hello {company}",
        category: "tech",
      },
    );

    expect(updated).toMatchObject({
      id: created.id,
      name: "Updated letter",
      content: "Hello {company}",
      category: "tech",
      createdAt: created.createdAt,
    });
    expect(updated?.updatedAt).toEqual(expect.any(String));

    expect(await mockInvoke<boolean>("delete_cover_letter_template", { id: created.id })).toBe(
      true,
    );
    expect(
      await mockInvoke<CoverLetterTemplate | null>("get_cover_letter_template", {
        id: created.id,
      }),
    ).toBeNull();
  });

  it("stores notification preferences with the real backend command names", async () => {
    const defaults = await mockInvoke<NotificationPreferences>("get_notification_preferences");

    expect(defaults.indeed).toEqual({
      enabled: true,
      minScoreThreshold: 70,
      soundEnabled: true,
    });

    await mockInvoke<void>("save_notification_preferences", {
      prefs: notificationPreferencesInput,
    });

    expect(await mockInvoke<NotificationPreferences>("get_notification_preferences")).toEqual(
      notificationPreferencesInput,
    );
  });

  it("generates deep links with the real backend command names", async () => {
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
        expect.objectContaining({ id: "stackoverflow", category: SiteCategory.Tech }),
      ]),
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
          url: expect.stringContaining("https://www.indeed.com/jobs?q=Rust%20Developer"),
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
    expect(linkedin.url).toContain("keywords=Rust%20Developer");
    expect(linkedin.url).toContain("location=Denver%2C%20CO");
    expect(linkedin.url).toContain("f_JT=F");
    expect(linkedin.url).toContain("f_WT=2");

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "https://www.linkedin.com/jobs/search/?keywords=Rust%20Developer",
      }),
    ).resolves.toBeUndefined();

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "http://localhost:3000/jobs?query=Rust%20Developer",
      }),
    ).rejects.toThrow("Blocked unsafe deep link URL");
  });

  it("previews and imports jobs with the real backend command names", async () => {
    const url = "https://jobs.example.com/careers/rust-platform-engineer";

    const preview = await mockInvoke<JobImportPreview>("preview_job_import", { url });

    expect(preview).toMatchObject({
      title: "Rust Platform Engineer",
      company: "jobs.example.com",
      url,
      location: "Remote",
      description_preview: expect.stringContaining("Rust Platform Engineer"),
      salary: "$120k-$180k",
      employment_types: ["FULL_TIME"],
      remote: true,
      missing_fields: [],
      already_exists: false,
    });
    expect(preview.date_posted).toEqual(expect.any(String));

    const imported = await mockInvoke<ImportedJob>("import_job_from_url", { url });

    expect(imported).toMatchObject({
      title: "Rust Platform Engineer",
      company: "jobs.example.com",
      url,
      source: "import",
      remote: true,
      score: 1,
    });
    expect(imported.hash).toContain("mock-import-");

    const duplicatePreview = await mockInvoke<JobImportPreview>("preview_job_import", { url });
    expect(duplicatePreview.already_exists).toBe(true);

    await expect(mockInvoke<ImportedJob>("import_job_from_url", { url })).rejects.toThrow(
      "This job already exists in your database",
    );

    await expect(
      mockInvoke<JobImportPreview>("preview_job_import", {
        url: "http://localhost:3000/jobs/rust-platform-engineer",
      }),
    ).rejects.toThrow("Blocked unsafe job import URL");
  });
});
