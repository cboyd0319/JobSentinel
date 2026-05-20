import { beforeEach, describe, expect, it } from "vitest";
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
});
