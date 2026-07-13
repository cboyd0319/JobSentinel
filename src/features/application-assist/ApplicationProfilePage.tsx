import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from "react";
import { Card } from "../../components/Card";
import { StatCard } from "../../components/StatCard";
import { Skeleton } from "../../components/Skeleton";
import { ProfileForm } from "./ProfileForm";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../../utils/errorUtils";
import { useToast } from "../../contexts";

interface ApplicationProfileProps {
  onBack: () => void;
}

interface AutomationStats {
  totalAttempts: number;
  submitted: number;
  failed: number;
  pending: number;
  successRate: number;
}

type Tab = "profile" | "screening";

const getTabClassName = (tab: Tab, activeTab: Tab) =>
  `app-section-tab ${activeTab === tab ? "app-section-tab-selected" : "app-section-tab-idle"}`;

export default function ApplicationProfilePage({ onBack }: ApplicationProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    profile: null,
    screening: null,
  });
  const toast = useToast();

  const focusTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => tabRefs.current[tab]?.focus());
  }, []);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: Tab) => {
    const tabs: readonly Tab[] = ["profile", "screening"];
    const currentIndex = tabs.indexOf(tab);
    if (currentIndex === -1) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(tabs[(currentIndex + 1) % tabs.length]!);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]!);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(tabs[0]!);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs[tabs.length - 1]!);
    }
  };

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoadingStats(true);
      const data = await invoke<AutomationStats>("get_automation_stats");

      if (signal?.aborted) return;
      setStats(data);
    } catch (error: unknown) {
      if (signal?.aborted) return;
      logError("Failed to load automation stats:", error);
      toast.error(
        "Could not load review history",
        "Your saved review history may not be visible right now. Copy a safe support report if this keeps happening, then close and reopen JobSentinel.",
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingStats(false);
      }
    }
  }, [toast]);

  // Load stats on mount
  useEffect(() => {
    const controller = new AbortController();

    loadStats(controller.signal);

    return () => controller.abort();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Go back"
            >
              <BackIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-display font-semibold text-surface-900 dark:text-white">
                Application Assist Settings
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Save details JobSentinel can prepare while you review each application
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loadingStats ? (
            <>
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
            </>
          ) : (
            <>
              <StatCard
                label="Opened for Review"
                value={stats?.totalAttempts ?? 0}
              />
              <StatCard
                label="Submitted by You"
                value={stats?.submitted ?? 0}
                trend={stats?.submitted ? { value: stats.submitted, isPositive: true } : undefined}
              />
              <StatCard
                label="Needs Follow-Up"
                value={stats?.pending ?? 0}
              />
              <StatCard
                label="Sent After Review"
                value={`${(stats?.successRate ?? 0).toFixed(0)}%`}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700 mb-6">
          <nav className="app-section-tabs" aria-label="Application assist settings" role="tablist">
            <button
              type="button"
              ref={(element) => {
                tabRefs.current.profile = element;
              }}
              role="tab"
              id="one-click-profile-tab"
              aria-controls="one-click-profile-panel"
              aria-selected={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              onKeyDown={(event) => handleTabKeyDown(event, "profile")}
              tabIndex={activeTab === "profile" ? 0 : -1}
              data-visual-state={activeTab === "profile" ? "selected" : "idle"}
              className={getTabClassName("profile", activeTab)}
            >
              <span className="app-section-tab-content">
                <UserIcon className="w-4 h-4" />
                Profile
              </span>
              {activeTab === "profile" && (
                <span
                  aria-hidden="true"
                  className="app-section-tab-indicator"
                  data-testid="application-assist-tab-indicator-profile"
                />
              )}
            </button>
            <button
              type="button"
              ref={(element) => {
                tabRefs.current.screening = element;
              }}
              role="tab"
              id="one-click-screening-tab"
              aria-controls="one-click-screening-panel"
              aria-selected={activeTab === "screening"}
              onClick={() => setActiveTab("screening")}
              onKeyDown={(event) => handleTabKeyDown(event, "screening")}
              tabIndex={activeTab === "screening" ? 0 : -1}
              data-visual-state={activeTab === "screening" ? "selected" : "idle"}
              className={getTabClassName("screening", activeTab)}
            >
              <span className="app-section-tab-content">
                <QuestionIcon className="w-4 h-4" />
                Screening Questions
              </span>
              {activeTab === "screening" && (
                <span
                  aria-hidden="true"
                  className="app-section-tab-indicator"
                  data-testid="application-assist-tab-indicator-screening"
                />
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div
            role="tabpanel"
            id="one-click-profile-panel"
            aria-labelledby="one-click-profile-tab"
          >
            <ProfileForm />
          </div>
        )}
        {activeTab === "screening" && (
          <div
            role="tabpanel"
            id="one-click-screening-panel"
            aria-labelledby="one-click-screening-tab"
          >
            <ScreeningAnswersForm />
          </div>
        )}

        {/* How It Works Section */}
        <Card className="mt-8 p-6 bg-gradient-to-br from-sentinel-50 to-blue-50 dark:from-sentinel-900/20 dark:to-blue-900/20 border-sentinel-200 dark:border-sentinel-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-sentinel-500" />
            How Application Assist Works
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <StepCard
              number={1}
              title="Find a Job"
              description="Browse jobs in your dashboard as usual"
            />
            <StepCard
              number={2}
              title="Choose Prepare Form"
              description="Use Prepare Form on a job card. If needed, choose Set Up Profile first."
            />
            <StepCard
              number={3}
              title="Review & Finish"
              description="A browser opens with matching profile details prepared"
            />
            <StepCard
              number={4}
              title="Submit Yourself"
              description="You review the form and submit it yourself"
            />
          </div>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-4">
            <strong>Important:</strong> JobSentinel never clicks Submit.
            You review every field and decide whether to submit.
          </p>
        </Card>
      </main>
    </div>
  );
}

// Step card for the How It Works section
function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-sentinel-500 text-white flex items-center justify-center font-bold mb-2">
        {number}
      </div>
      <h4 className="font-medium text-surface-900 dark:text-white text-sm">
        {title}
      </h4>
      <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
        {description}
      </p>
    </div>
  );
}

// Icons
function BackIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function QuestionIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
