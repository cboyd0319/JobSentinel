import { useState, useEffect } from "react";
import { Card, StatCard, Skeleton } from "../components";
import { ProfileForm, ScreeningAnswersForm } from "../components/automation";
import { invoke } from "@tauri-apps/api/core";
import { logError } from "../utils/errorUtils";

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

export default function ApplicationProfile({ onBack }: ApplicationProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await invoke<AutomationStats>("get_automation_stats");
      setStats(data);
    } catch (error) {
      logError("Failed to load automation stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

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
                One-Click Apply Settings
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Configure your application profile for quick form filling
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
                label="Total Attempts"
                value={stats?.totalAttempts ?? 0}
              />
              <StatCard
                label="Submitted"
                value={stats?.submitted ?? 0}
                trend={stats?.submitted ? { value: stats.submitted, isPositive: true } : undefined}
              />
              <StatCard
                label="Pending"
                value={stats?.pending ?? 0}
              />
              <StatCard
                label="Success Rate"
                value={`${(stats?.successRate ?? 0).toFixed(0)}%`}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700 mb-6">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab("screening")}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "screening"
                  ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <QuestionIcon className="w-4 h-4" />
                Screening Questions
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <ProfileForm />}
        {activeTab === "screening" && <ScreeningAnswersForm />}

        {/* How It Works Section */}
        <Card className="mt-8 p-6 bg-gradient-to-br from-sentinel-50 to-blue-50 dark:from-sentinel-900/20 dark:to-blue-900/20 border-sentinel-200 dark:border-sentinel-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-sentinel-500" />
            How One-Click Apply Works
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <StepCard
              number={1}
              title="Find a Job"
              description="Browse jobs in your dashboard as usual"
            />
            <StepCard
              number={2}
              title="Click Quick Apply"
              description="Select a job and click the Quick Apply button"
            />
            <StepCard
              number={3}
              title="Review & Complete"
              description="A browser opens with fields pre-filled from your profile"
            />
            <StepCard
              number={4}
              title="Submit Manually"
              description="You review the form and click Submit yourself"
            />
          </div>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-4">
            <strong>Important:</strong> We never submit applications automatically.
            You always review and click the final Submit button yourself.
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
