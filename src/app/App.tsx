import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Page } from "./routes";
import { default as ErrorBoundary } from "./errors/ErrorBoundary";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { SkipToContent } from "../ui/SkipToContent";
import { CommandPalette } from "./commands/CommandPalette";
import { default as PageErrorBoundary } from "./errors/PageErrorBoundary";
import { KeyboardShortcutsHelp } from "./commands/KeyboardShortcutsHelp";
import {
  OnboardingProvider,
  TourHelpButton,
} from "./onboarding/OnboardingProvider";
import { useOnboarding } from "./onboarding/useOnboarding";
import { Navigation } from "./Navigation";
import { KeyboardShortcutsProvider } from "./keyboard/KeyboardShortcutsProvider";
import { useKeyboardShortcuts } from "./keyboard/useKeyboardShortcuts";
import { logError } from "../shared/errorReporting/logger";
import { defaultTourSteps } from "./onboarding/tourSteps";
import {
  copySanitizedDebugReport,
  saveSanitizedDebugReport,
} from "../services/feedbackService";

// Lazy load pages for better initial load performance
const SetupWizard = lazy(() => import("../features/onboarding"));
const Dashboard = lazy(() => import("../features/dashboard"));
const Applications = lazy(() => import("../features/applications"));
const Settings = lazy(() => import("../features/settings"));
const ResumeLibraryPage = lazy(() =>
  import("../features/resumes").then((module) => ({
    default: module.ResumeLibraryPage,
  })),
);
const ResumeBuilderPage = lazy(() =>
  import("../features/resumes").then((module) => ({
    default: module.ResumeBuilderPage,
  })),
);
const ResumeMatchPage = lazy(() =>
  import("../features/resumes").then((module) => ({
    default: module.ResumeMatchPage,
  })),
);
const Salary = lazy(() => import("../features/salary"));
const Market = lazy(() => import("../features/market"));
const SearchLinks = lazy(() => import("../features/search-links"));
const ApplicationProfile = lazy(() => import("../features/application-assist"));
const ApplyButton = lazy(() =>
  import("../features/application-assist").then((module) => ({
    default: module.ApplyButton,
  })),
);

// Loading fallback for lazy-loaded pages
function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner message={message} />
    </div>
  );
}

// Global keyboard help modal - consumes context
function GlobalKeyboardHelp() {
  const { isHelpOpen, closeHelp } = useKeyboardShortcuts();
  return <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />;
}

// Auto-start tour after setup completion
function TourStartTrigger({
  shouldStart,
  onStarted,
}: {
  shouldStart: boolean;
  onStarted: () => void;
}) {
  const { startTour, hasCompletedTour } = useOnboarding();

  useEffect(() => {
    if (shouldStart && !hasCompletedTour) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => {
        startTour();
        onStarted();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldStart, hasCompletedTour, startTour, onStarted]);

  return null;
}

export function StartupRecovery({ onRetry }: { onRetry: () => void }) {
  const [reportStatus, setReportStatus] = useState<
    "idle" | "copying" | "copied" | "saving" | "saved" | "failed"
  >("idle");

  const copyReport = async () => {
    setReportStatus("copying");
    try {
      await copySanitizedDebugReport();
      setReportStatus("copied");
    } catch (error) {
      logError("Failed to copy startup support report:", error);
      setReportStatus("failed");
    }
  };

  const saveReport = async () => {
    setReportStatus("saving");
    try {
      const saved = await saveSanitizedDebugReport();
      setReportStatus(saved ? "saved" : "idle");
    } catch (error) {
      logError("Failed to save startup support report:", error);
      setReportStatus("failed");
    }
  };

  return (
    <ErrorBoundary>
      <SkipToContent />
      <main
        className="min-h-screen bg-surface-950 text-white flex items-center justify-center px-6"
        id="main-content"
        tabIndex={-1}
      >
        <section className="w-full max-w-lg rounded-card border border-surface-700 bg-surface-900 p-8 shadow-xl">
          <h1 className="font-display text-display-lg mb-3">
            JobSentinel could not open saved setup
          </h1>
          <p className="text-sm text-surface-300 mb-6">
            Your saved jobs and settings stay on this device. Try again, or save
            a safe support report before closing and reopening JobSentinel.
          </p>
          <div className="space-y-3">
            <button
              className="w-full rounded-lg bg-sentinel-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sentinel-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400"
              onClick={onRetry}
            >
              Try Again
            </button>
            <button
              className="w-full rounded-lg bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-100 hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 disabled:opacity-50"
              disabled={reportStatus === "copying"}
              onClick={() => void copyReport()}
            >
              {reportStatus === "copying"
                ? "Copying..."
                : "Copy Safe Support Report"}
            </button>
            <button
              className="w-full rounded-lg bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-100 hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 disabled:opacity-50"
              disabled={reportStatus === "saving"}
              onClick={() => void saveReport()}
            >
              {reportStatus === "saving"
                ? "Saving..."
                : "Save Safe Support Report"}
            </button>
          </div>
          {reportStatus === "copied" && (
            <p className="mt-4 text-sm text-success" role="status">
              Safe support report copied
            </p>
          )}
          {reportStatus === "saved" && (
            <p className="mt-4 text-sm text-success" role="status">
              Safe support report saved for review
            </p>
          )}
          {reportStatus === "failed" && (
            <p className="mt-4 text-sm text-danger" role="status">
              Could not create safe support report
            </p>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [openImportOnDashboard, setOpenImportOnDashboard] = useState(false);
  const [shouldStartTour, setShouldStartTour] = useState(false);

  const checkFirstRun = useCallback(async () => {
    try {
      setStartupError(false);
      setLoading(true);
      const firstRun = await invoke<boolean>("is_first_run");
      setIsFirstRun(firstRun);
    } catch (error) {
      logError("Failed to check first run:", error);
      setStartupError(true);
      setIsFirstRun(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkFirstRun();
  }, [checkFirstRun]);

  const handleSetupComplete = () => {
    setIsFirstRun(false);
    // Trigger tour after setup completes
    setShouldStartTour(true);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  // Moved before early returns to comply with hooks rules
  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const openJobImportFromApplications = useCallback(() => {
    setOpenImportOnDashboard(true);
    setCurrentPage("dashboard");
  }, []);

  if (loading) {
    return <LoadingSpinner message="Initializing JobSentinel..." />;
  }

  if (startupError) {
    return <StartupRecovery onRetry={() => void checkFirstRun()} />;
  }

  if (isFirstRun) {
    return (
      <ErrorBoundary>
        <SkipToContent />
        <div className="min-h-screen" id="main-content" tabIndex={-1}>
          <Suspense
            fallback={<PageLoader message="Getting JobSentinel ready..." />}
          >
            <SetupWizard onComplete={handleSetupComplete} />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <KeyboardShortcutsProvider
        onNavigate={(page) => navigateTo(page as Page)}
        onOpenSettings={openSettings}
      >
        <OnboardingProvider steps={defaultTourSteps}>
          <SkipToContent />
          <CommandPalette />
          <GlobalKeyboardHelp />
          <TourStartTrigger
            shouldStart={shouldStartTour}
            onStarted={() => setShouldStartTour(false)}
          />

          {/* Navigation sidebar */}
          <Navigation currentPage={currentPage} onNavigate={navigateTo} />

          {/* Main content with left margin for sidebar */}
          <div
            className="min-h-screen ml-16 overflow-x-hidden"
            id="main-content"
            tabIndex={-1}
          >
            <Suspense fallback={<PageLoader />}>
              {currentPage === "dashboard" && (
                <PageErrorBoundary pageName="Dashboard">
                  <Dashboard
                    onNavigate={navigateTo}
                    tourAction={<TourHelpButton />}
                    renderApplicationAssistAction={(
                      job,
                      onOpenApplicationAssist,
                    ) => (
                      <Suspense fallback={null}>
                        <ApplyButton
                          job={{
                            id: job.id,
                            hash: job.hash ?? `job-${job.id}`,
                            title: job.title,
                            company: job.company,
                            location: job.location ?? "",
                            url: job.url,
                            description: job.description ?? undefined,
                            score: job.score ?? undefined,
                          }}
                          onOpenApplicationAssist={onOpenApplicationAssist}
                        />
                      </Suspense>
                    )}
                    settingsPage={Settings}
                    showSettings={showSettings}
                    onShowSettingsChange={setShowSettings}
                    openImportOnMount={openImportOnDashboard}
                    onImportHandled={() => setOpenImportOnDashboard(false)}
                  />
                </PageErrorBoundary>
              )}
              {currentPage === "applications" && (
                <PageErrorBoundary
                  pageName="Applications"
                  onBack={() => navigateTo("dashboard")}
                >
                  <Applications
                    onBack={() => navigateTo("dashboard")}
                    onImportJob={openJobImportFromApplications}
                  />
                </PageErrorBoundary>
              )}
              {currentPage === "resume" && (
                <PageErrorBoundary
                  pageName="Resume"
                  onBack={() => navigateTo("dashboard")}
                >
                  <ResumeLibraryPage onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
              {currentPage === "resume-builder" && (
                <PageErrorBoundary
                  pageName="Resume Builder"
                  onBack={() => navigateTo("dashboard")}
                >
                  <ResumeBuilderPage onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
              {currentPage === "ats-optimizer" && (
                <PageErrorBoundary
                  pageName="Resume Match"
                  onBack={() => navigateTo("dashboard")}
                >
                  <ResumeMatchPage
                    onBack={() => navigateTo("dashboard")}
                    onNavigate={navigateTo}
                  />
                </PageErrorBoundary>
              )}
              {currentPage === "salary" && (
                <PageErrorBoundary
                  pageName="Salary"
                  onBack={() => navigateTo("dashboard")}
                >
                  <Salary onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
              {currentPage === "market" && (
                <PageErrorBoundary
                  pageName="Market"
                  onBack={() => navigateTo("dashboard")}
                >
                  <Market onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
              {currentPage === "search-links" && (
                <PageErrorBoundary
                  pageName="Search Links"
                  onBack={() => navigateTo("dashboard")}
                >
                  <SearchLinks />
                </PageErrorBoundary>
              )}
              {currentPage === "automation" && (
                <PageErrorBoundary
                  pageName="Application Assist"
                  onBack={() => navigateTo("dashboard")}
                >
                  <ApplicationProfile onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
            </Suspense>
          </div>
        </OnboardingProvider>
      </KeyboardShortcutsProvider>
    </ErrorBoundary>
  );
}

export default App;
