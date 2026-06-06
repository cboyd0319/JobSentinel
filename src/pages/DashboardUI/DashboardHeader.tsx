// Dashboard Header Component
// Logo, title, status indicator, theme toggle, settings button, search button

import { memo } from "react";
import { Button } from "../../components/Button";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Tooltip } from "../../components/Tooltip";
import { TourHelpButton } from "../../components/OnboardingTour";
import { SentinelIcon, SearchIcon, SettingsIcon } from "../DashboardIcons";
import type { ScrapingStatus } from "../DashboardTypes";
import { formatRelativeDate } from "../../utils/formatUtils";

interface DashboardHeaderProps {
  scrapingStatus: ScrapingStatus;
  autoRefreshEnabled: boolean;
  nextRefreshTime: Date | null;
  formatTimeUntil: (date: Date) => string;
  searching: boolean;
  searchCooldown: boolean;
  cooldownSeconds?: number;
  onSearchNow: () => void;
  onOpenSettings: () => void;
}

// Format relative time for "last updated" display
function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return formatRelativeDate(dateStr);
}

export const DashboardHeader = memo(function DashboardHeader({
  scrapingStatus,
  autoRefreshEnabled,
  nextRefreshTime,
  formatTimeUntil,
  searching,
  searchCooldown,
  cooldownSeconds = 0,
  onSearchNow,
  onOpenSettings,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Logo & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-sentinel-500 rounded-lg flex items-center justify-center">
              <SentinelIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                JobSentinel
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Privacy-preserving job search
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:justify-end">
            {/* Status indicator with last updated */}
            <Tooltip
              content={
                scrapingStatus.is_running
                  ? "Checking selected job sites"
                  : autoRefreshEnabled && nextRefreshTime
                    ? `Next check in ${formatTimeUntil(nextRefreshTime)}`
                    : "Ready to search"
              }
              position="bottom"
            >
              <div className="flex min-w-0 items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <div className={
                  scrapingStatus.is_running
                    ? "status-dot-active"
                    : autoRefreshEnabled
                      ? "status-dot-auto"
                      : "status-dot-idle"
                } />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-surface-600 dark:text-surface-300">
                    {scrapingStatus.is_running
                      ? "Checking..."
                      : autoRefreshEnabled && nextRefreshTime
                        ? formatTimeUntil(nextRefreshTime)
                        : "Ready"
                    }
                  </span>
                  {scrapingStatus.last_scrape && !scrapingStatus.is_running && (
                    <span className="text-[10px] text-surface-400 dark:text-surface-500">
                      Updated {formatLastUpdated(scrapingStatus.last_scrape)}
                    </span>
                  )}
                </div>
              </div>
            </Tooltip>

            <div data-tour="theme-toggle">
              <ThemeToggle />
            </div>

            <Tooltip content="Take a tour" position="bottom">
              <TourHelpButton />
            </Tooltip>

            <Tooltip content="Settings" position="bottom">
              <button
                onClick={onOpenSettings}
                className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer rounded-lg"
                aria-label="Open settings"
                data-tour="settings-button"
              >
                <SettingsIcon />
              </button>
            </Tooltip>

            <Button
              onClick={onSearchNow}
              loading={searching}
              loadingText="Checking..."
              disabled={searchCooldown && !searching}
              icon={<SearchIcon />}
              aria-label={searching ? "Checking job sources" : searchCooldown ? `Search available in ${cooldownSeconds} seconds` : "Search for new jobs"}
              data-tour="search-button"
              data-testid="btn-search-now"
              className="basis-full justify-center sm:basis-auto sm:ml-auto md:ml-0"
            >
              {searching ? "Checking..." : searchCooldown ? `Wait ${cooldownSeconds}s` : "Search Now"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
});
