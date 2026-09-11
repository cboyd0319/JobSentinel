/** Verifies an empty country-filtered view offers local preference changes and import. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardJobList } from "./DashboardJobList";
import { getNoJobsEmptyStateCopy } from "./noJobsEmptyStateCopy";

describe("country-filtered empty results", () => {
  it.each([false, true])("opens Settings without searching when noSourcesEnabled is %s", async (noSourcesEnabled) => {
    const user = userEvent.setup();
    const onSearchNow = vi.fn(), onOpenSettings = vi.fn(), onOpenImport = vi.fn();
    render(<DashboardJobList
      jobs={[]} filteredJobs={[]} noJobsCopy={getNoJobsEmptyStateCopy(!noSourcesEnabled, "GB")}
      noSourcesEnabled={noSourcesEnabled} countryFiltered searching={false}
      jobListRef={{ current: null }} bulkMode={false} selectedJobIds={new Set()}
      isKeyboardActive={false} selectedIndex={0} salaryFloorUsd={null}
      onSearchNow={onSearchNow} onOpenSettings={onOpenSettings} onOpenImport={onOpenImport}
      onClearFilters={vi.fn()} onToggleJobSelection={vi.fn()} onHideJob={vi.fn()}
      onToggleBookmark={vi.fn()} onEditNotes={vi.fn()} onResearchCompany={vi.fn()}
    />);
    await user.click(screen.getByRole("button", { name: "Adjust Search Country" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onSearchNow).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Import a Job Posting" }));
    expect(onOpenImport).toHaveBeenCalledOnce();
  });
});
