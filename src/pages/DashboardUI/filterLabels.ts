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
    { value: "high", label: "Strong (70%+)" },
    { value: "medium", label: "Some (40-69%)" },
    { value: "low", label: "Low (<40%)" },
  ];

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
