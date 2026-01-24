// Dashboard Filter Hook
// Manages all filter state and filtering/sorting logic

import { useState, useMemo } from "react";
import type {
  Job,
  SortOption,
  ScoreFilter,
  PostedDateFilter,
  GhostFilter,
  SearchQuery
} from "../DashboardTypes";
import { SALARY_THOUSANDS_MULTIPLIER, GHOST_SCORE_THRESHOLD } from "../../utils/constants";

// Parse advanced search query with AND, OR, NOT operators
export function parseSearchQuery(query: string): SearchQuery {
  const trimmed = query.trim();
  if (!trimmed) return { includes: [], excludes: [], isOr: false };

  const excludes: string[] = [];
  const includes: string[] = [];
  let isOr = false;

  // Check for OR mode (comma-separated or explicit OR)
  if (trimmed.includes(',') || trimmed.toUpperCase().includes(' OR ')) {
    isOr = true;
  }

  // Split by comma or OR
  const parts = trimmed
    .split(/,|\sOR\s/i)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  for (const part of parts) {
    // Handle AND within each part
    const andParts = part.split(/\sAND\s/i).map(p => p.trim());

    for (const term of andParts) {
      // Handle NOT/- prefix
      if (term.startsWith('-') || term.toUpperCase().startsWith('NOT ')) {
        const excludeTerm = term.replace(/^-|^NOT\s+/i, '').trim();
        if (excludeTerm) excludes.push(excludeTerm.toLowerCase());
      } else {
        if (term) includes.push(term.toLowerCase());
      }
    }
  }

  return { includes, excludes, isOr };
}

// Match job against parsed search query
export function matchesSearchQuery(
  job: { title: string; company: string; location: string | null },
  query: SearchQuery
): boolean {
  const searchableText = `${job.title} ${job.company} ${job.location || ''}`.toLowerCase();

  // Check excludes first - any match means exclude
  for (const exclude of query.excludes) {
    if (searchableText.includes(exclude)) return false;
  }

  // If no includes, pass (only excludes matter)
  if (query.includes.length === 0) return true;

  // OR mode: any include matches
  if (query.isOr) {
    return query.includes.some(term => searchableText.includes(term));
  }

  // AND mode: all includes must match
  return query.includes.every(term => searchableText.includes(term));
}

export interface FilterState {
  sortBy: SortOption;
  scoreFilter: ScoreFilter;
  sourceFilter: string;
  remoteFilter: string;
  bookmarkFilter: string;
  notesFilter: string;
  postedDateFilter: PostedDateFilter;
  ghostFilter: GhostFilter;
  salaryMinFilter: number | null;
  salaryMaxFilter: number | null;
  textSearch: string;
}

export interface FilterActions {
  setSortBy: (value: SortOption) => void;
  setScoreFilter: (value: ScoreFilter) => void;
  setSourceFilter: (value: string) => void;
  setRemoteFilter: (value: string) => void;
  setBookmarkFilter: (value: string) => void;
  setNotesFilter: (value: string) => void;
  setPostedDateFilter: (value: PostedDateFilter) => void;
  setGhostFilter: (value: GhostFilter) => void;
  setSalaryMinFilter: (value: number | null) => void;
  setSalaryMaxFilter: (value: number | null) => void;
  setTextSearch: (value: string) => void;
  clearFilters: () => void;
  getCurrentFilters: () => Omit<FilterState, "textSearch">;
  loadFilters: (filters: Partial<Omit<FilterState, "textSearch">>) => void;
}

export function useDashboardFilters(jobs: Job[]) {
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [remoteFilter, setRemoteFilter] = useState<string>("all");
  const [bookmarkFilter, setBookmarkFilter] = useState<string>("all");
  const [notesFilter, setNotesFilter] = useState<string>("all");
  const [postedDateFilter, setPostedDateFilter] = useState<PostedDateFilter>("all");
  const [ghostFilter, setGhostFilter] = useState<GhostFilter>("all");
  const [salaryMinFilter, setSalaryMinFilter] = useState<number | null>(null);
  const [salaryMaxFilter, setSalaryMaxFilter] = useState<number | null>(null);
  const [textSearch, setTextSearch] = useState("");

  // Get unique sources from jobs
  const availableSources = useMemo(() => {
    const sources = new Set(jobs.map((job) => job.source));
    return ["all", ...Array.from(sources)];
  }, [jobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Apply text search filter with advanced query support (AND, OR, NOT)
    if (textSearch.trim()) {
      const query = parseSearchQuery(textSearch);
      result = result.filter((job) => matchesSearchQuery(job, query));
    }

    // Apply score filter
    if (scoreFilter !== "all") {
      result = result.filter((job) => {
        if (scoreFilter === "high") return job.score >= 0.7;
        if (scoreFilter === "medium") return job.score >= 0.4 && job.score < 0.7;
        if (scoreFilter === "low") return job.score < 0.4;
        return true;
      });
    }

    // Apply source filter
    if (sourceFilter !== "all") {
      result = result.filter((job) => job.source === sourceFilter);
    }

    // Apply remote filter
    if (remoteFilter !== "all") {
      result = result.filter((job) => {
        if (remoteFilter === "remote") return job.remote === true;
        if (remoteFilter === "onsite") return job.remote === false;
        return true;
      });
    }

    // Apply bookmark filter
    if (bookmarkFilter !== "all") {
      result = result.filter((job) => {
        if (bookmarkFilter === "bookmarked") return job.bookmarked === true;
        if (bookmarkFilter === "not-bookmarked") return job.bookmarked !== true;
        return true;
      });
    }

    // Apply notes filter
    if (notesFilter !== "all") {
      result = result.filter((job) => {
        if (notesFilter === "has-notes") return !!job.notes;
        if (notesFilter === "no-notes") return !job.notes;
        return true;
      });
    }

    // Apply posted date filter
    if (postedDateFilter !== "all") {
      const now = new Date();
      result = result.filter((job) => {
        const jobDate = new Date(job.created_at);
        const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);
        if (postedDateFilter === "24h") return diffHours <= 24;
        if (postedDateFilter === "7d") return diffHours <= 24 * 7;
        if (postedDateFilter === "30d") return diffHours <= 24 * 30;
        return true;
      });
    }

    // Apply salary filter
    if (salaryMinFilter !== null || salaryMaxFilter !== null) {
      result = result.filter((job) => {
        // Skip jobs without salary info if filter is active
        const hasMinSalary = job.salary_min != null;
        const hasMaxSalary = job.salary_max != null;
        if (!hasMinSalary && !hasMaxSalary) return false;

        const jobMin = job.salary_min ?? job.salary_max ?? 0;
        const jobMax = job.salary_max ?? job.salary_min ?? 0;

        // Check against filters (salary filter is in thousands, job salary is in actual dollars)
        if (salaryMinFilter !== null) {
          const minThreshold = salaryMinFilter * SALARY_THOUSANDS_MULTIPLIER;
          if (jobMax < minThreshold) return false;
        }
        if (salaryMaxFilter !== null) {
          const maxThreshold = salaryMaxFilter * SALARY_THOUSANDS_MULTIPLIER;
          if (jobMin > maxThreshold) return false;
        }
        return true;
      });
    }

    // Apply ghost filter (v1.4)
    if (ghostFilter !== "all") {
      result = result.filter((job) => {
        const isGhost = (job.ghost_score ?? 0) >= GHOST_SCORE_THRESHOLD;
        if (ghostFilter === "real") return !isGhost;
        if (ghostFilter === "ghost") return isGhost;
        return true;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "score-desc":
          return b.score - a.score;
        case "score-asc":
          return a.score - b.score;
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "company-asc":
          return a.company.localeCompare(b.company);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, textSearch, scoreFilter, sourceFilter, remoteFilter, bookmarkFilter, notesFilter, postedDateFilter, salaryMinFilter, salaryMaxFilter, ghostFilter, sortBy]);

  const clearFilters = () => {
    setTextSearch("");
    setScoreFilter("all");
    setSourceFilter("all");
    setRemoteFilter("all");
    setBookmarkFilter("all");
    setNotesFilter("all");
    setGhostFilter("all");
    setPostedDateFilter("all");
    setSalaryMinFilter(null);
    setSalaryMaxFilter(null);
  };

  const getCurrentFilters = () => ({
    sortBy,
    scoreFilter,
    sourceFilter,
    remoteFilter,
    bookmarkFilter,
    notesFilter,
    postedDateFilter,
    salaryMinFilter,
    salaryMaxFilter,
  });

  const loadFilters = (filters: Partial<Omit<FilterState, "textSearch">>) => {
    if (filters.sortBy !== undefined) setSortBy(filters.sortBy);
    if (filters.scoreFilter !== undefined) setScoreFilter(filters.scoreFilter);
    if (filters.sourceFilter !== undefined) setSourceFilter(filters.sourceFilter);
    if (filters.remoteFilter !== undefined) setRemoteFilter(filters.remoteFilter);
    if (filters.bookmarkFilter !== undefined) setBookmarkFilter(filters.bookmarkFilter);
    if (filters.notesFilter !== undefined) setNotesFilter(filters.notesFilter);
    if (filters.postedDateFilter !== undefined) setPostedDateFilter(filters.postedDateFilter);
    if (filters.salaryMinFilter !== undefined) setSalaryMinFilter(filters.salaryMinFilter);
    if (filters.salaryMaxFilter !== undefined) setSalaryMaxFilter(filters.salaryMaxFilter);
    if (filters.ghostFilter !== undefined) setGhostFilter(filters.ghostFilter);
  };

  const hasActiveFilters = textSearch || scoreFilter !== "all" || sourceFilter !== "all" ||
    remoteFilter !== "all" || bookmarkFilter !== "all" || notesFilter !== "all" ||
    ghostFilter !== "all" || postedDateFilter !== "all" ||
    salaryMinFilter !== null || salaryMaxFilter !== null;

  return {
    // State
    sortBy,
    scoreFilter,
    sourceFilter,
    remoteFilter,
    bookmarkFilter,
    notesFilter,
    postedDateFilter,
    ghostFilter,
    salaryMinFilter,
    salaryMaxFilter,
    textSearch,
    availableSources,
    filteredAndSortedJobs,
    hasActiveFilters,
    // Actions
    setSortBy,
    setScoreFilter,
    setSourceFilter,
    setRemoteFilter,
    setBookmarkFilter,
    setNotesFilter,
    setPostedDateFilter,
    setGhostFilter,
    setSalaryMinFilter,
    setSalaryMaxFilter,
    setTextSearch,
    clearFilters,
    getCurrentFilters,
    loadFilters,
  };
}
