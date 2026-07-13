import { useCallback, useRef, type KeyboardEvent } from "react";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { BackIcon, TabIconView, type TabIcon } from "./MarketPrimitives";
import type { MarketTabId } from "./model";

interface MarketHeaderProps {
  activeTab: MarketTabId;
  analyzing: boolean;
  lastFetched: Date | null;
  onBack: () => void;
  onRefresh: () => void;
  onTabChange: (tab: MarketTabId) => void;
  unreadAlertCount: number;
}

interface Tab {
  id: MarketTabId;
  label: string;
  icon: TabIcon;
  badge?: number;
}

type Staleness = "fresh" | "normal" | "stale" | "very-stale";

const STALENESS_COLORS: Record<Staleness, string> = {
  fresh: "text-green-500 dark:text-green-400",
  normal: "text-surface-400 dark:text-surface-500",
  stale: "text-amber-500 dark:text-amber-400",
  "very-stale": "text-red-500 dark:text-red-400",
};

function formatRelativeTime(date: Date): { text: string; stale: Staleness } {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return { text: "just now", stale: "fresh" };
  if (diffMinutes < 30) return { text: `${diffMinutes}m ago`, stale: "fresh" };
  if (diffMinutes < 60) return { text: `${diffMinutes}m ago`, stale: "normal" };
  if (diffHours < 2) return { text: `${diffHours}h ago`, stale: "stale" };
  if (diffHours < 24) return { text: `${diffHours}h ago`, stale: "very-stale" };
  return { text: date.toLocaleDateString(), stale: "very-stale" };
}

export function MarketHeader({
  activeTab,
  analyzing,
  lastFetched,
  onBack,
  onRefresh,
  onTabChange,
  unreadAlertCount,
}: MarketHeaderProps) {
  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: "chart" },
    { id: "skills", label: "Skills", icon: "tool" },
    { id: "companies", label: "Companies", icon: "building" },
    { id: "locations", label: "Locations", icon: "location" },
    { id: "alerts", label: "Alerts", icon: "bell", badge: unreadAlertCount || undefined },
  ];
  const tabRefs = useRef<Record<MarketTabId, HTMLButtonElement | null>>({
    overview: null,
    skills: null,
    companies: null,
    locations: null,
    alerts: null,
  });

  const focusTab = useCallback((tabId: MarketTabId) => {
    onTabChange(tabId);
    window.requestAnimationFrame(() => tabRefs.current[tabId]?.focus());
  }, [onTabChange]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: MarketTabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      if (nextTab) focusTab(nextTab.id);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const previousTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      if (previousTab) focusTab(previousTab.id);
    } else if (event.key === "Home") {
      event.preventDefault();
      const firstTab = tabs[0];
      if (firstTab) focusTab(firstTab.id);
    } else if (event.key === "End") {
      event.preventDefault();
      const lastTab = tabs[tabs.length - 1];
      if (lastTab) focusTab(lastTab.id);
    }
  };

  const updated = lastFetched ? formatRelativeTime(lastFetched) : null;

  return (
    <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
              aria-label="Go back"
            >
              <BackIcon />
            </button>
            <div>
              <h1 className="font-display text-display-md text-surface-900 dark:text-white">Hiring Trends</h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Job trends, company activity, and location signals
                {updated && (
                  <span className={`ml-2 ${STALENESS_COLORS[updated.stale]}`}>
                    · Updated {updated.text}
                    {updated.stale === "very-stale" && " (may be outdated)"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={onRefresh} loading={analyzing}>Refresh Hiring Trends</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Hiring Trends sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[tab.id] = element; }}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={activeTab === tab.id ? `${tab.id}-panel` : undefined}
              id={`${tab.id}-tab`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`flex min-w-0 items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-surface-50 dark:bg-surface-900 text-sentinel-600 dark:text-sentinel-400 border-t border-x border-surface-200 dark:border-surface-700"
                  : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <TabIconView icon={tab.icon} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <Badge variant="alert" className="ml-1">{tab.badge}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
