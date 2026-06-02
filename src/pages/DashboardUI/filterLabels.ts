import type { ScoreFilter, SortOption } from "../DashboardTypes";

export const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "score-desc", label: "Best Match First" },
  { value: "score-asc", label: "Lowest Match First" },
  { value: "date-desc", label: "Date (Newest)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "company-asc", label: "Company (A-Z)" },
];

export const scoreFilterOptions: Array<{ value: ScoreFilter; label: string }> =
  [
    { value: "all", label: "All Matches" },
    { value: "high", label: "Strong Match" },
    { value: "medium", label: "Some Match" },
    { value: "low", label: "Needs Review" },
  ];

const remoteFilterLabels: Record<string, string> = {
  all: "All Locations",
  remote: "Remote Only",
  onsite: "On-site Only",
};

const bookmarkFilterLabels: Record<string, string> = {
  all: "All Jobs",
  bookmarked: "Bookmarked",
  "not-bookmarked": "Not Bookmarked",
};

const notesFilterLabels: Record<string, string> = {
  all: "All Jobs",
  "has-notes": "With Notes",
  "no-notes": "No Notes",
};

export function formatSortOption(value: SortOption): string {
  return (
    sortOptions.find((option) => option.value === value)?.label ??
    "Selected sort"
  );
}

export function formatScoreFilter(value: ScoreFilter): string {
  return (
    scoreFilterOptions.find((option) => option.value === value)?.label ??
    "Selected match"
  );
}

export function formatRemoteFilter(value: string): string {
  return remoteFilterLabels[value] ?? "Selected location";
}

export function formatBookmarkFilter(value: string): string {
  return bookmarkFilterLabels[value] ?? "Selected saved state";
}

export function formatNotesFilter(value: string): string {
  return notesFilterLabels[value] ?? "Selected notes state";
}
