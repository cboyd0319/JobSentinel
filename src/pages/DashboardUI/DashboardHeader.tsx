// Dashboard Header Component
// Logo, title, status indicator, theme toggle, settings button, search button

import { memo } from "react";
import { Button, ThemeToggle, Tooltip, TourHelpButton } from "../../components";
import { SentinelIcon, SearchIcon, SettingsIcon } from "../DashboardIcons";
import type { ScrapingStatus } from "../DashboardTypes";

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
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
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
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sentinel-500 rounded-lg flex items-center justify-center">
              <SentinelIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                JobSentinel
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Privacy-first job search automation
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Status indicator with last updated */}
            <Tooltip
              content={
                scrapingStatus.is_running
                  ? "Currently scanning job boards"
                  : autoRefreshEnabled && nextRefreshTime
                    ? `Auto-refresh in ${formatTimeUntil(nextRefreshTime)}`
                    : "Ready to scan"
              }
              position="bottom"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <div className={
                  scrapingStatus.is_running
                    ? "status-dot-active"
                    : autoRefreshEnabled
                      ? "status-dot-auto"
                      : "status-dot-idle"
                } />
                <div className="flex flex-col">
                  <span className="text-sm text-surface-600 dark:text-surface-300">
                    {scrapingStatus.is_running
                      ? "Scanning..."
                      : autoRefreshEnabled && nextRefreshTime
                        ? formatTimeUntil(nextRefreshTime)
                        : "Idle"
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
                className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                aria-label="Open settings"
                data-tour="settings-button"
              >
                <SettingsIcon />
              </button>
            </Tooltip>

            <Button
              onClick={onSearchNow}
              loading={searching}
              disabled={searchCooldown && !searching}
              icon={<SearchIcon />}
              aria-label={searching ? "Scanning job boards" : searchCooldown ? `Search available in ${cooldownSeconds} seconds` : "Search for new jobs"}
              data-tour="search-button"
              data-testid="btn-search-now"
            >
              {searching ? "Scanning..." : searchCooldown ? `Wait ${cooldownSeconds}s` : "Search Now"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
});
