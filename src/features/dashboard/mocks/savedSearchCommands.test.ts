import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../test-support/mocks/handlers";
import type { PostedDateFilter, ScoreFilter, SortOption } from "../types";
import { handleMockSavedSearchCommand } from "./savedSearchCommands";

interface BackendSavedSearch {
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
}

const savedSearchInput: BackendSavedSearch = {
  id: "",
  name: "Remote Support",
  sortBy: "score-desc",
  scoreFilter: "all",
  sourceFilter: "all",
  remoteFilter: "remote",
  bookmarkFilter: "all",
  notesFilter: "all",
  postedDateFilter: "7d",
  salaryMinFilter: 55000,
  salaryMaxFilter: 72000,
  ghostFilter: null,
  textSearch: "support",
  createdAt: "",
  lastUsedAt: null,
};

describe("Dashboard saved-search mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("stores saved searches with the backend command names", async () => {
    const created = await mockInvoke<BackendSavedSearch>("create_saved_search", {
      search: savedSearchInput,
    });

    expect(created).toMatchObject({
      id: "mock-saved-search-1",
      name: "Remote Support",
      sortBy: "score-desc",
      scoreFilter: "all",
      sourceFilter: "all",
      remoteFilter: "remote",
      bookmarkFilter: "all",
      notesFilter: "all",
      postedDateFilter: "7d",
      salaryMinFilter: 55000,
      salaryMaxFilter: 72000,
      ghostFilter: null,
      textSearch: "support",
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
    await mockInvoke<void>("add_search_history", { query: "care coordinator remote" });
    await mockInvoke<void>("add_search_history", { query: "inventory planner remote" });
    await mockInvoke<void>("add_search_history", { query: "care coordinator remote" });

    expect(await mockInvoke<string[]>("get_search_history", { limit: 20 })).toEqual([
      "care coordinator remote",
      "inventory planner remote",
    ]);
    expect(await mockInvoke<string[]>("get_search_history", { limit: 1 })).toEqual([
      "care coordinator remote",
    ]);

    await mockInvoke<void>("clear_search_history");
    expect(await mockInvoke<string[]>("get_search_history", { limit: 20 })).toEqual([]);
  });

  it("imports each saved-search identifier once", async () => {
    const search = {
      ...savedSearchInput,
      id: "search-import-1",
      createdAt: "2026-06-19T12:00:00Z",
    };

    expect(
      await mockInvoke<number>("import_saved_searches", {
        searches: [search, search],
      }),
    ).toBe(1);
    expect(await mockInvoke<BackendSavedSearch[]>("list_saved_searches")).toEqual([
      search,
    ]);
  });

  it("rejects commands owned by another feature", () => {
    const state = { savedSearches: [], searchHistory: [] };

    expect(
      handleMockSavedSearchCommand("get_notification_preferences", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
