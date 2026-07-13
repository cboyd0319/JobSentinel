import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps, RefObject } from "react";
import { DashboardFiltersBar } from "./DashboardFiltersBar";
import type { Job } from "../types";

const jobs: Job[] = [
  {
    id: 1,
    title: "Customer Support Lead",
    company: "CareBridge Health",
    location: "Remote",
    url: "https://example.com/job/1",
    source: "Greenhouse",
    score: 92,
    created_at: "2026-06-01T08:00:00Z",
  },
  {
    id: 2,
    title: "Operations Coordinator",
    company: "Northstar Community Clinic",
    location: "Denver, CO",
    url: "https://example.com/job/2",
    source: "Lever",
    score: 84,
    created_at: "2026-06-01T08:00:00Z",
  },
];

function renderFilters(overrides: Partial<ComponentProps<typeof DashboardFiltersBar>> = {}) {
  const noop = vi.fn();
  const searchInputRef = { current: null } as RefObject<HTMLInputElement>;

  return render(
    <DashboardFiltersBar
      jobs={jobs}
      filteredJobs={jobs}
      textSearch=""
      setTextSearch={noop}
      searchInputRef={searchInputRef}
      showSearchHistory={false}
      setShowSearchHistory={noop}
      searchHistory={[]}
      addToSearchHistory={noop}
      clearSearchHistory={noop}
      sortBy="score-desc"
      setSortBy={noop}
      scoreFilter="all"
      setScoreFilter={noop}
      sourceFilter="all"
      setSourceFilter={noop}
      availableSources={["all", "Greenhouse", "Lever"]}
      remoteFilter="all"
      setRemoteFilter={noop}
      bookmarkFilter="all"
      setBookmarkFilter={noop}
      notesFilter="all"
      setNotesFilter={noop}
      ghostFilter="all"
      setGhostFilter={noop}
      postedDateFilter="all"
      setPostedDateFilter={noop}
      salaryMinFilter={null}
      setSalaryMinFilter={noop}
      salaryMaxFilter={null}
      setSalaryMaxFilter={noop}
      hasActiveFilters={false}
      clearFilters={noop}
      checkingDuplicates={false}
      handleCheckDuplicates={noop}
      bulkMode={false}
      toggleBulkMode={noop}
      onExportJobs={noop}
      onOpenSaveSearch={noop}
      savedSearches={[]}
      onLoadSearch={noop}
      selectedJobIds={new Set()}
      selectAllJobs={noop}
      clearSelection={noop}
      handleBulkExport={noop}
      handleCompareJobs={noop}
      handleBulkBookmark={noop}
      handleBulkHide={noop}
      {...overrides}
    />,
  );
}

describe("DashboardFiltersBar plain-language actions", () => {
  it("uses plain search and download copy for the default toolbar", async () => {
    renderFilters();

    const searchInput = screen.getByRole("textbox", { name: "Search jobs" });
    expect(searchInput).toHaveAttribute(
      "placeholder",
      "Search jobs",
    );
    expect(screen.getByRole("button", { name: "Download job list" })).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum yearly salary")).toHaveAttribute(
      "placeholder",
      "Min $/year",
    );
    expect(screen.getByLabelText("Maximum yearly salary")).toHaveAttribute(
      "placeholder",
      "Max $/year",
    );
    expect(screen.queryByLabelText(/salary in thousands/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export jobs to CSV" })).not.toBeInTheDocument();
    expect(screen.queryByText("j/k/o/h")).not.toBeInTheDocument();
    expect(screen.queryByText(/Navigate: j\/k/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/senior AND manager/i)).not.toBeInTheDocument();

    fireEvent.focus(searchInput);
    expect(
      await screen.findByText(/Search Words to Avoid in Settings/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/minus sign/i)).not.toBeInTheDocument();
  });

  it("uses plain download copy for selected jobs", () => {
    renderFilters({
      bulkMode: true,
      selectedJobIds: new Set([1, 2]),
    });

    expect(screen.getByRole("button", { name: "Download 2 selected jobs" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export 2 selected jobs to CSV" })).not.toBeInTheDocument();
  });

  it("uses possible-repeat copy for repeat checks", () => {
    renderFilters();

    expect(screen.getByRole("button", { name: "Check for possible repeated jobs" })).toBeInTheDocument();
    expect(screen.getByText("Possible repeats")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check for duplicates" })).not.toBeInTheDocument();
    expect(screen.queryByText("Duplicates")).not.toBeInTheDocument();
  });

  it("labels source choices without raw source IDs", () => {
    renderFilters({
      availableSources: ["all", "greenhouse", "manual_import", "city_careers"],
    });

    fireEvent.click(screen.getByText("All Sources"));

    expect(screen.getByRole("option", { name: "Greenhouse hiring page" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Saved by you" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "City Careers" })).toBeInTheDocument();
    expect(screen.queryByText("manual_import")).not.toBeInTheDocument();
  });
});
