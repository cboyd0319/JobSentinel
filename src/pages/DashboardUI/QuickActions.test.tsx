import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickActions } from "./QuickActions";

function renderQuickActions() {
  const noop = vi.fn();

  return render(
    <QuickActions
      totalJobs={12}
      highMatches={3}
      filteredCount={8}
      onExportHighMatches={noop}
      onShowHighMatchesOnly={noop}
      onShowRemoteOnly={noop}
      onClearFilters={noop}
      hasActiveFilters={false}
      onImportJob={noop}
    />,
  );
}

describe("QuickActions plain-language actions", () => {
  it("uses download copy for top jobs", () => {
    renderQuickActions();

    expect(screen.getByRole("button", { name: "Download Top Jobs" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export Top Jobs" })).not.toBeInTheDocument();
  });
});
