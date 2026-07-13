import { useState } from "react";
import { CompanyAutocomplete } from "./CompanyAutocomplete";
import { HelpIcon } from "../../../ui/HelpIcon";
import type { AdvancedFilters } from "./notificationPreferencesStore";

// Advanced Filters Section Component
interface AdvancedFiltersSectionProps {
  filters: AdvancedFilters;
  onChange: (updates: Partial<AdvancedFilters>) => void;
  disabled?: boolean;
}

export function AdvancedFiltersSection({
  filters,
  onChange,
  disabled,
}: AdvancedFiltersSectionProps) {
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [favoriteCompanyInput, setFavoriteCompanyInput] = useState("");
  const [skipCompanyInput, setSkipCompanyInput] = useState("");

  const addKeyword = (type: "include" | "exclude", value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (type === "include") {
      if (!filters.includeKeywords.includes(trimmed)) {
        onChange({ includeKeywords: [...filters.includeKeywords, trimmed] });
      }
      setIncludeInput("");
    } else {
      if (!filters.excludeKeywords.includes(trimmed)) {
        onChange({ excludeKeywords: [...filters.excludeKeywords, trimmed] });
      }
      setExcludeInput("");
    }
  };

  const removeKeyword = (type: "include" | "exclude", value: string) => {
    if (type === "include") {
      onChange({
        includeKeywords: filters.includeKeywords.filter((k) => k !== value),
      });
    } else {
      onChange({
        excludeKeywords: filters.excludeKeywords.filter((k) => k !== value),
      });
    }
  };

  const addFavoriteCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed) return;
    if (!filters.includedCompanies.includes(trimmed)) {
      onChange({ includedCompanies: [...filters.includedCompanies, trimmed] });
    }
  };

  const addSkipCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed) return;
    if (!filters.excludedCompanies.includes(trimmed)) {
      onChange({ excludedCompanies: [...filters.excludedCompanies, trimmed] });
    }
  };

  const removeCompany = (type: "favorite" | "skip", value: string) => {
    if (type === "favorite") {
      onChange({
        includedCompanies: filters.includedCompanies.filter((c) => c !== value),
      });
    } else {
      onChange({
        excludedCompanies: filters.excludedCompanies.filter((c) => c !== value),
      });
    }
  };

  return (
    <div
      className={`mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <FilterIcon className="w-4 h-4 text-surface-500" />
        <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide flex items-center gap-1">
          Extra alert rules
          <HelpIcon
            text="Additional rules to customize which jobs you get notified about. All of these are optional."
            size="sm"
          />
        </div>
      </div>

      {/* Keyword Filters */}
      <div className="space-y-3 mb-4">
        {/* Include Keywords */}
        <div>
          <label
            htmlFor="notification-include-keyword"
            className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block"
          >
            Alert only when the job title has
          </label>
          <div className="flex flex-col gap-2 mb-2 sm:flex-row">
            <input
              id="notification-include-keyword"
              type="text"
              value={includeInput}
              onChange={(e) => setIncludeInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && addKeyword("include", includeInput)
              }
              placeholder="e.g., Manager, Lead, Coordinator"
              className="min-w-0 flex-1 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
            />
            <button
              onClick={() => addKeyword("include", includeInput)}
              className="px-3 py-1.5 text-sm bg-sentinel-500 text-white rounded-lg hover:bg-sentinel-600 transition-colors"
            >
              Add
            </button>
          </div>
          {filters.includeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.includeKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                >
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {keyword}
                  </span>
                  <button
                    onClick={() => removeKeyword("include", keyword)}
                    className="flex-shrink-0 hover:text-green-900 dark:hover:text-green-300"
                    aria-label={`Remove include keyword ${keyword}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Exclude Keywords */}
        <div>
          <label
            htmlFor="notification-exclude-keyword"
            className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block"
          >
            Do not alert when the job title has
          </label>
          <div className="flex flex-col gap-2 mb-2 sm:flex-row">
            <input
              id="notification-exclude-keyword"
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && addKeyword("exclude", excludeInput)
              }
              placeholder="e.g., Intern, Contract, Temporary"
              className="min-w-0 flex-1 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
            />
            <button
              onClick={() => addKeyword("exclude", excludeInput)}
              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Add
            </button>
          </div>
          {filters.excludeKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.excludeKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full"
                >
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {keyword}
                  </span>
                  <button
                    onClick={() => removeKeyword("exclude", keyword)}
                    className="flex-shrink-0 hover:text-red-900 dark:hover:text-red-300"
                    aria-label={`Remove exclude keyword ${keyword}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Salary & Remote Filters */}
      <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
        {/* Minimum yearly pay */}
        <div>
          <label
            htmlFor="notification-min-salary"
            className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block"
          >
            Minimum yearly pay
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-surface-500">$</span>
            <input
              id="notification-min-salary"
              type="number"
              value={filters.minSalary === null ? "" : filters.minSalary * 1000}
              onChange={(e) =>
                onChange({
                  minSalary: e.target.value
                    ? Math.round(parseInt(e.target.value) / 1000)
                    : null,
                })
              }
              placeholder="e.g., 90000"
              className="w-full max-w-32 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
            />
            <span className="text-surface-500 text-sm">per year</span>
          </div>
        </div>

        {/* Remote jobs only */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Remote jobs only
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              aria-label="Remote jobs only"
              checked={filters.remoteOnly}
              onChange={(e) => onChange({ remoteOnly: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sentinel-300 rounded-full peer dark:bg-surface-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel-500"></div>
            <span className="ml-2 text-sm text-surface-600 dark:text-surface-400">
              {filters.remoteOnly ? "Yes" : "No"}
            </span>
          </label>
        </div>
      </div>

      {/* Company Filters */}
      <div className="space-y-3">
        {/* Companies users want alerts from */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Companies you want alerts from
            <span className="block font-normal text-surface-500">
              Get alerts only from these, or leave empty for all.
            </span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={favoriteCompanyInput}
              onChange={setFavoriteCompanyInput}
              onAdd={addFavoriteCompany}
              placeholder="e.g., Mayo Clinic, Target, City of Denver"
              existingCompanies={filters.includedCompanies}
              buttonColor="blue"
            />
          </div>
          {filters.includedCompanies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.includedCompanies.map((company) => (
                <span
                  key={company}
                  className="inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                >
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {company}
                  </span>
                  <button
                    onClick={() => removeCompany("favorite", company)}
                    className="flex-shrink-0 hover:text-blue-900 dark:hover:text-blue-300"
                    aria-label={`Remove preferred company ${company}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Companies to skip */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
            Companies to skip
            <span className="block font-normal text-surface-500">
              Never get alerts from these.
            </span>
          </label>
          <div className="mb-2">
            <CompanyAutocomplete
              value={skipCompanyInput}
              onChange={setSkipCompanyInput}
              onAdd={addSkipCompany}
              placeholder="e.g., Acme Services, Example Staffing"
              existingCompanies={filters.excludedCompanies}
              buttonColor="surface"
            />
          </div>
          {filters.excludedCompanies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.excludedCompanies.map((company) => (
                <span
                  key={company}
                  className="inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-0.5 text-xs bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full"
                >
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {company}
                  </span>
                  <button
                    onClick={() => removeCompany("skip", company)}
                    className="flex-shrink-0 hover:text-surface-900 dark:hover:text-surface-100"
                    aria-label={`Remove skipped company ${company}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}
