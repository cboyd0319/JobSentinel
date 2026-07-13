import type { PostedDateFilter, ScoreFilter, SortOption } from "../types";
import {
  getArg,
  getNumericArg,
  getStringArg,
} from "../../../mocks/handlers/commandHelpers";

export interface MockSavedSearch {
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

interface MockSavedSearchCommandState {
  savedSearches: MockSavedSearch[];
  searchHistory: string[];
}

export interface MockSavedSearchCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockSavedSearchCommandState;
  value: unknown;
}

const SORT_OPTIONS: readonly SortOption[] = [
  "score-desc",
  "score-asc",
  "date-desc",
  "date-asc",
  "company-asc",
];
const SCORE_FILTERS: readonly ScoreFilter[] = ["all", "high", "medium", "low"];
const POSTED_DATE_FILTERS: readonly PostedDateFilter[] = ["all", "24h", "7d", "30d"];

export function handleMockSavedSearchCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  switch (command) {
    case "get_search_history": {
      const limit = Math.max(0, Math.min(getNumericArg(args, "limit") ?? 20, 50));
      return withoutSave(state, state.searchHistory.slice(0, limit));
    }
    case "list_saved_searches":
      return withoutSave(
        state,
        state.savedSearches.map((search) => ({ ...search })),
      );
    case "create_saved_search":
      return createSavedSearch(args, state);
    case "use_saved_search":
      return markSavedSearchUsed(args, state);
    case "delete_saved_search":
      return deleteSavedSearch(args, state);
    case "import_saved_searches":
      return importSavedSearches(args, state);
    case "add_search_history":
      return addSearchHistory(args, state);
    case "clear_search_history":
      return saved({ ...state, searchHistory: [] }, undefined);
    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

export function getNextMockSavedSearchId(searches: MockSavedSearch[]): string {
  const maxId = searches.reduce((max, search) => {
    const match = /^mock-saved-search-(\d+)$/.exec(search.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-saved-search-${maxId + 1}`;
}

export function normalizeMockSavedSearch(
  value: unknown,
  fallbackId: string,
): MockSavedSearch {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : fallbackId,
    name: typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Saved search",
    sortBy: isSortOption(source.sortBy) ? source.sortBy : "score-desc",
    scoreFilter: isScoreFilter(source.scoreFilter) ? source.scoreFilter : "all",
    sourceFilter: typeof source.sourceFilter === "string" ? source.sourceFilter : "all",
    remoteFilter: typeof source.remoteFilter === "string" ? source.remoteFilter : "all",
    bookmarkFilter: typeof source.bookmarkFilter === "string" ? source.bookmarkFilter : "all",
    notesFilter: typeof source.notesFilter === "string" ? source.notesFilter : "all",
    postedDateFilter: isPostedDateFilter(source.postedDateFilter)
      ? source.postedDateFilter
      : null,
    salaryMinFilter: nullableNumber(source.salaryMinFilter),
    salaryMaxFilter: nullableNumber(source.salaryMaxFilter),
    ghostFilter: nullableString(source.ghostFilter),
    textSearch: nullableString(source.textSearch),
    createdAt: typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now,
    lastUsedAt: nullableString(source.lastUsedAt),
  };
}

function createSavedSearch(
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  const search = {
    ...normalizeMockSavedSearch(
      getArg(args, "search"),
      getNextMockSavedSearchId(state.savedSearches),
    ),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  return saved(
    {
      ...state,
      savedSearches: [
        search,
        ...state.savedSearches.filter((savedSearch) => savedSearch.id !== search.id),
      ],
    },
    { ...search },
  );
}

function markSavedSearchUsed(
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  let found = false;
  const lastUsedAt = new Date().toISOString();
  const id = getStringArg(args, "id");
  const savedSearches = state.savedSearches.map((search) => {
    if (search.id !== id) return search;
    found = true;
    return { ...search, lastUsedAt };
  });

  return found
    ? saved({ ...state, savedSearches }, true)
    : withoutSave(state, false);
}

function deleteSavedSearch(
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  const id = getStringArg(args, "id");
  const savedSearches = state.savedSearches.filter((search) => search.id !== id);
  return savedSearches.length !== state.savedSearches.length
    ? saved({ ...state, savedSearches }, true)
    : withoutSave(state, false);
}

function importSavedSearches(
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  const input = getArg(args, "searches");
  const searches = Array.isArray(input) ? input : [];
  const nextSearches = [...state.savedSearches];
  let imported = 0;

  for (const search of searches) {
    const normalized = normalizeMockSavedSearch(
      search,
      getNextMockSavedSearchId(nextSearches),
    );
    if (nextSearches.some((candidate) => candidate.id === normalized.id)) continue;
    nextSearches.push(normalized);
    imported += 1;
  }

  return imported > 0
    ? saved({ ...state, savedSearches: nextSearches }, imported)
    : withoutSave(state, imported);
}

function addSearchHistory(
  args: Record<string, unknown> | undefined,
  state: MockSavedSearchCommandState,
): MockSavedSearchCommandResult {
  const query = getStringArg(args, "query")?.trim();
  if (!query || query.length < 2) return withoutSave(state, undefined);

  return saved(
    {
      ...state,
      searchHistory: [
        query,
        ...state.searchHistory.filter((entry) => entry !== query),
      ].slice(0, 50),
    },
    undefined,
  );
}

function saved(
  state: MockSavedSearchCommandState,
  value: unknown,
): MockSavedSearchCommandResult {
  return { handled: true, shouldSave: true, state, value };
}

function withoutSave(
  state: MockSavedSearchCommandState,
  value: unknown,
): MockSavedSearchCommandResult {
  return { handled: true, shouldSave: false, state, value };
}

function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && SORT_OPTIONS.includes(value as SortOption);
}

function isScoreFilter(value: unknown): value is ScoreFilter {
  return typeof value === "string" && SCORE_FILTERS.includes(value as ScoreFilter);
}

function isPostedDateFilter(value: unknown): value is PostedDateFilter {
  return typeof value === "string" && POSTED_DATE_FILTERS.includes(
    value as PostedDateFilter,
  );
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
