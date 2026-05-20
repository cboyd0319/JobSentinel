import { beforeEach, describe, expect, it } from "vitest";
import type { PostedDateFilter, ScoreFilter, SortOption } from "../pages/DashboardTypes";
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
});
